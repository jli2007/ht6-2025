// components/CSSEditor.jsx
import React, { useState, useRef, useEffect } from "react";
import { Save, Play, Layers, Code2 } from "lucide-react";
import photoshopController from "../controllers/PhotoshopController";
import "./Terminal.css";

export const Terminal = () => {
  const [cssCode, setCssCode] = useState(`#layer1 {
  blur: 10;
  opacity: 80;
  hue: 75;
  brightness: 100;
  }`);

  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState([]);
  const textareaRef = useRef(null);

  // Add log function
  const addLog = (message, type = "info") => {
    setLogs((prev) => [
      ...prev,
      { message, type, timestamp: new Date().toLocaleTimeString() },
    ]);
  };

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
    addLog(`Found ${Object.keys(layers).length} layers`, "info");

    try {
      const result = await photoshopController.applyCSSOperations(cssCode);
      addLog(`✅ Applied ${result.operationsCount} ops`, "success");
    } catch (err) {
      addLog(`Error: ${err.message}`, "error");
    }
  };

  // Simulate Photoshop execution
  const simulatePhotoshopExecution = async (script, layers) => {
    addLog("Sending to Photoshop...", "info");

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    Object.entries(layers).forEach(([layerName, styles]) => {
      addLog(
        `Applied styles to ${layerName}: ${Object.keys(styles).join(", ")}`,
        "success"
      );
    });

    addLog("HMR complete - Photoshop updated!", "success");
  };

  const handleRun = () => {
    handleSave();
  };

  const connectToPhotoshop = async () => {
    const connected = await photoshopController.checkPhotoshopConnection();
    setIsConnected(connected);
    addLog(
      connected
        ? "Connected to Photoshop via UXP"
        : "Failed to connect. Open a document!",
      connected ? "success" : "error"
    );
  };

  return (
    <div className="css-editor">
      {/* Header */}
      <div className="css-editor__header">
        <div className="css-editor__header-left">
          <Layers className="css-editor__icon css-editor__icon--blue" />
          <h1 className="css-editor__title">CSS to Photoshop</h1>
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
            onClick={handleRun}
            className="css-editor__button css-editor__button--purple"
          >
            <Play className="css-editor__button-icon" />
            Run
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="css-editor__main">
        {/* Editor */}
        <div className="css-editor__editor">
          <div className="css-editor__editor-header">
            <Code2 className="css-editor__icon css-editor__icon--gray" />
            <span className="css-editor__editor-filename">styles.css</span>
          </div>

          <div className="css-editor__editor-content">
            <textarea
              ref={textareaRef}
              value={cssCode}
              onChange={(e) => setCssCode(e.target.value)}
              className="css-editor__textarea"
              placeholder="Enter your CSS styles here..."
              spellCheck={false}
            />
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
