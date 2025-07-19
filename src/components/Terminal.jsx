// components/CSSEditor.jsx
import React, { useState, useRef, useEffect } from "react";
import { Save, Play, Layers, Code2 } from "lucide-react";
import photoshopController from "../controllers/PhotoshopController";
import "./Terminal.css";
import { Chroma } from "./chroma";

export const Terminal = () => {
  const [cssCode, setCssCode] = useState(`#layer1 {
  blur: 10;
  opacity: 80;
  hue: 25;
  brightness: 25;
  }`);

  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState([]);
  const textareaRef = useRef(null);
  const [showPopup, setShowPopup] = useState(false);
  const [text, setText] = useState("");

  // Add log function
  const addLog = (message, type = "info") => {
    setLogs((prev) => [
      ...prev,
      { message, type, timestamp: new Date().toLocaleTimeString() },
    ]);
  };

  useEffect(() => {
    // Listen for log events from the controller
    const handleLog = (logData) => {
      addLog(logData.message, logData.type);
    };

    const handleConnectionChange = (data) => {
      setIsConnected(data.connected);
      addLog(
        data.connected
          ? "Connected to Photoshop via UXP"
          : "Lost connection to Photoshop",
        data.connected ? "success" : "error"
      );
    };

    // Register event listeners
    photoshopController.on("log", handleLog);
    photoshopController.on("connectionChanged", handleConnectionChange);

    // Cleanup listeners on unmount
    return () => {
      photoshopController.off("log", handleLog);
      photoshopController.off("connectionChanged", handleConnectionChange);
    };
  }, []);

  // Parse CSS to extract layer styles
  const parseCSSToLayers = (css) => {
    const layers = {};
    const rules = css.match(/#[^{]+\{[^}]+\}/g) || [];

    rules.forEach((rule) => {
      const [selector, styles] = rule.split("{");
      const layerName = selector.trim().substring(1); // Remove #
      const styleString = styles.replace("}", "").trim();

      const layerStyles = {};
      styleString.split(";").forEach((style) => {
        const [property, value] = style.split(":").map((s) => s.trim());
        if (property && value) {
          layerStyles[property] = parseFloat(value) || value;
        }
      });

      layers[layerName] = layerStyles;
    });

    return layers;
  };

  // Handle save (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [cssCode]);

  const handleSave = async () => {
    addLog("Parsing CSS...", "info");
    const layers = parseCSSToLayers(cssCode);
    addLog(`Found ${Object.keys(layers).length} layers to process`, "info");

    try {
      const result = await photoshopController.applyCSSOperations(cssCode);
      console.log(result);
      // Don't add additional logs here since the controller now handles all logging
    } catch (err) {
      // This should rarely happen now since controller catches most errors
      addLog(`Unexpected error: ${err.message}`, "error");
    }
  };

  const connectToPhotoshop = async () => {
    addLog("Attempting to connect to Photoshop...", "info");
    const connected = await photoshopController.checkPhotoshopConnection();
    // Connection change will be handled by the event listener
  };

  return (
    <div className="css-editor">
      <div className="css-editor__header">
        <div className="css-editor__header-left">
          <img
            src={Chroma}
            alt="logo"
            style={{ width: "15vw", height: "auto" }}
          />
        </div>

        <div className="css-editor__header-right">
          <div
            className={`css-editor__status ${
              isConnected
                ? "css-editor__status--connected"
                : "css-editor__status--disconnected"
            }`}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </div>

          {!isConnected && (
            <button
              onClick={connectToPhotoshop}
              className="css-editor__button css-editor__button--blue"
            >
              Connect
            </button>
          )}

          <button
            onClick={handleSave}
            className="css-editor__button css-editor__button--green"
          >
            <Save className="css-editor__button-icon" />
            Save (Ctrl+S)
          </button>

          <button
            onClick={handleSave}
            className="css-editor__button css-editor__button--purple"
          >
            <Play className="css-editor__button-icon" />
            Run
          </button>
        </div>
      </div>

      <div className="css-editor__main">
        <div className="css-editor__editor">
          <div className="css-editor__editor-header">
            <Code2 className="css-editor__icon css-editor__icon--gray" />
            <span className="css-editor__editor-filename">styles.css</span>
          </div>

          <div className="css-editor__editor-content">
            <div className="textarea-container" style={{ position: 'relative', height: '100%' }}>
              <textarea
                id="codeTextarea"
                ref={textareaRef}
                value={cssCode}
                onChange={(e) => setCssCode(e.target.value)}
                className="code-textarea"
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  padding: '20px',
                  paddingLeft: '60px',
                  resize: 'none',
                  tabSize: 2,
                  caretColor: '#d4d4d4',
                  zIndex: 2
                }}
                placeholder="Enter your CSS styles here..."
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        {/* Logs panel */}
        <div className="css-editor__logs">
          <div className="css-editor__logs-header">
            <h3 className="css-editor__logs-title">Console</h3>
          </div>

          <div className="css-editor__logs-content">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`css-editor__log css-editor__log--${log.type}`}
              >
                <span className="css-editor__log-timestamp">
                  [{log.timestamp}]
                </span>{" "}
                {log.message}
              </div>
            ))}

            {logs.length === 0 && (
              <div className="css-editor__log css-editor__log--empty">
                No logs yet. Save your CSS to see output.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="css-editor__status-bar">
        Ready • Press Ctrl+S to save and update Photoshop
      </div>
    </div>
  );
};

export default Terminal;
