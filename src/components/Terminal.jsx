// components/Terminal.jsx
import React, { useState, useRef, useEffect } from "react";
import photoshopController from "../controllers/PhotoshopController";
import "./Terminal.css";
import { Chroma } from "./chroma";

// --- UXP File System API ---
// We need to import the storage module AND the formats enum from UXP
const { localFileSystem, formats } = require("uxp").storage;

export const Terminal = () => {
  console.log('Terminal component rendering...');

  const [cssCode, setCssCode] = useState(`#layer1 {
  blur: 0px;
  opacity: 1.0;
  hue-shift: 0deg;
  brightness: 0;
  contrast: 0;
  saturation: 0;
}`);

  // Image upload state
  const [inspirationImage, setInspirationImage] = useState(null); // Will now store { data, mimeType, name }
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  
  // New state for the export modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportedCss, setExportedCss] = useState("");

  // --- NEW: State for API Rate Limiting ---
  const [isApiRateLimited, setIsApiRateLimited] = useState(false);

  // Comprehensive list of Photoshop CSS properties with precise values
  const photoshopCssProperties = [
    'opacity', 'blending-mode', 'fill-opacity', 'brightness', 'contrast', 
    'exposure', 'saturation', 'hue-shift', 'vibrance', 'temperature', 'tint',
    'drop-shadow', 'inner-shadow', 'outer-glow', 'stroke', 'color-overlay', 
    'gradient-overlay', 'blur', 'sharpen', 'noise', 'grain', 'vignette'
  ];

  const [logs, setLogs] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
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

  // Helper function to update CSS (always replace)
  const updateCssCode = (newCss) => {
    setCssCode(newCss);
    addLog("✨ Replaced CSS with new styles", "success");
  };

  useEffect(() => {
    // Listen for log events from the controller
    const handleLog = (logData) => {
      addLog(logData.message, logData.type);
    };

    // Register event listeners
    photoshopController.on("log", handleLog);

    // Cleanup listeners on unmount
    return () => {
      photoshopController.off("log", handleLog);
    };
  }, []);

  // Parse CSS to extract layer styles
  const parseCSSToLayers = (css) => {
    const layers = {};
    const rules = css.match(/#[^{]+\{[^}]+\}/g) || [];

    rules.forEach((rule) => {
      const [selector, styles] = rule.split("{");
      const layerName = selector.trim().substring(1);
      const styleString = styles.replace("}", "").trim();
      const layerStyles = {};
      styleString.split(";").forEach((style) => {
        const [property, value] = style.split(":").map((s) => s.trim());
        if (property && value) {
          layerStyles[property] = value;
        }
      });
      layers[layerName] = layerStyles;
    });
    return layers;
  };

  // Initialize component safely
  useEffect(() => {
    addLog("Plugin loaded successfully", "success");
  }, []);

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
    try {
      console.log("CSS to apply:", cssCode);
      const result = await photoshopController.applyCSSOperations(cssCode, false); // Always use normal mode
      console.log("Apply result:", result);
      addLog(`✅ Applied ${result.operationsCount} ops`, "success");
    } catch (err) {
      console.error("Save error:", err);
      addLog(`Error: ${err.message || 'Unknown error occurred'}`, "error");
    }
  };

  // UXP-NATIVE FILE UPLOAD HANDLER
  const handleBrowseForImage = async () => {
    try {
        const imageFile = await localFileSystem.getFileForOpening({
            types: ["jpg", "jpeg", "png", "webp"],
            allowMultiple: false
        });
        if (!imageFile) {
            addLog("No image selected.", "warning");
            return;
        }

        addLog(`📸 Selected image: ${imageFile.name}`, "info");

        const buffer = await imageFile.read({ format: formats.binary });
        
                 // --- FIX: Robust Base64 encoding for binary data ---
         const uint8Array = new Uint8Array(buffer);
         let base64String = '';
         
         // Convert to base64 using a more reliable method
         const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
         base64String = btoa(binaryString);
         
         // Validate base64 string
         if (!base64String || base64String.length === 0) {
           throw new Error('Failed to convert image to base64');
         }
        
        let mimeType = "image/jpeg";
        if (imageFile.name.toLowerCase().endsWith(".png")) mimeType = "image/png";
        if (imageFile.name.toLowerCase().endsWith(".webp")) mimeType = "image/webp";
        
                 const dataUrl = `data:${mimeType};base64,${base64String}`;
         
         // Debug: Check if base64 is valid
         console.log('Base64 length:', base64String.length);
         console.log('Base64 starts with:', base64String.substring(0, 50));
         console.log('MIME type:', mimeType);
         
         setImagePreview(dataUrl);
         setInspirationImage({ data: base64String, mimeType: mimeType, name: imageFile.name });

    } catch (error) {
        console.error("File selection error:", error);
        addLog(`Error selecting image: ${error.message}`, "error");
    }
  };

  // --- API Call Debounce Helper ---
  const withApiDebounce = (apiFunction) => async (...args) => {
    if (isApiRateLimited) {
        addLog("Rate limit active. Please wait a few seconds.", "warning");
        return;
    }
    setIsApiRateLimited(true);
    setTimeout(() => setIsApiRateLimited(false), 5000); // 5-second cooldown
    await apiFunction(...args);
  };

  // Generate CSS from inspiration image
  const handleGenerateFromImage = withApiDebounce(async () => {
    if (!inspirationImage) {
      addLog("Please upload an inspiration image first", "error");
      return;
    }

    const apiKey = 'AIzaSyBJcjtZ0VtFC-xlYrxcwyzibzsi5kD-b8U';
    if (!apiKey) {
      addLog("Gemini API key not configured", "error");
      return;
    }

    setIsAnalyzingImage(true);
    addLog(`Analyzing ${inspirationImage.name}...`, "info");

    try {
      const currentLayerName = await photoshopController.getCurrentLayerName();
      if (!currentLayerName) {
        addLog("No active layer found. Please select a layer.", "error");
        setIsAnalyzingImage(false);
        return;
      }
      addLog(`Targeting layer: #${currentLayerName}`, "info");
      
      const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      
      const requestBody = {
        contents: [{
          parts: [
                          {
                text: `You are an expert Photoshop colorist who analyzes images and extracts their visual style into precise CSS-like adjustments. 

Analyze this inspiration image and identify its key visual characteristics:
- Color temperature and tint
- Contrast and brightness levels  
- Saturation and vibrance
- Any special effects (blur, grain, vignette, etc.)
- Overall mood and aesthetic

Generate CSS that will apply the same visual style to another image. Use precise numerical values for maximum customization control.

Available Properties:
${photoshopCssProperties.map(prop => `- ${prop}`).join('\n')}

IMPORTANT: Use our custom CSS format with direct property values, NOT standard CSS filters. For example:
- Use: \`brightness: 15\` (NOT \`filter: brightness(1.15)\`)
- Use: \`contrast: 25\` (NOT \`filter: contrast(1.25)\`)
- Use: \`saturation: -20\` (NOT \`filter: saturate(0.8)\`)

Return ONLY the CSS code block for the layer selector #${currentLayerName}. Do not include any explanation or markdown formatting.`
              },
            {
              inlineData: {
                mimeType: inspirationImage.mimeType,
                data: inspirationImage.data
              }
            }
          ]
        }]
      };

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const generatedText = data.candidates[0].content.parts[0].text;
        const cssMatch = generatedText.match(/```css\s*([\s\S]*?)\s*```|(#\w+\s*\{[\s\S]*?\})/);
        if (cssMatch) {
          let extractedCSS = (cssMatch[1] || cssMatch[2]).trim();
          updateCssCode(extractedCSS);
        } else {
          updateCssCode(generatedText.trim());
        }
      } else {
        throw new Error('No valid content in Gemini API response');
      }

    } catch (error) {
      console.error('Image analysis error:', error);
      addLog(`Error analyzing image: ${error.message}`, "error");
    } finally {
      setIsAnalyzingImage(false);
    }
  });
  
  const handleGenerateFromText = withApiDebounce(async () => {
    if (!prompt.trim()) {
      addLog("Please enter a description", "error");
      return;
    }

    const apiKey = 'AIzaSyBJcjtZ0VtFC-xlYrxcwyzibzsi5kD-b8U';

    if (!apiKey) {
      addLog("Gemini API key not configured", "error");
      return;
    }

    setIsGenerating(true);
    addLog("Generating CSS with Gemini...", "info");

    try {
      const currentLayerName = await photoshopController.getCurrentLayerName();
      if (!currentLayerName) {
         addLog("No active layer found. Please select a layer.", "error");
         setIsGenerating(false);
         return;
      }
      addLog(`Targeting layer: #${currentLayerName}`, "info");

      const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      
      const requestBody = {
        contents: [{
          parts: [{
            text: `You are an expert Photoshop colorist who translates visual styles into a custom CSS-like language. Your task is to convert a user's style description into a precise code block.

Analyze the user's prompt and generate a style that accurately reflects the described aesthetic. Use precise numerical values for maximum customization control.

Available Properties:
${photoshopCssProperties.map(prop => `- ${prop}`).join('\n')}

IMPORTANT: Use our custom CSS format with direct property values, NOT standard CSS filters. For example:
- Use: \`brightness: 15\` (NOT \`filter: brightness(1.15)\`)
- Use: \`contrast: 25\` (NOT \`filter: contrast(1.25)\`)
- Use: \`saturation: -20\` (NOT \`filter: saturate(0.8)\`)

Here are some high-quality examples using precise values:

- "hot pink barbie": A bright, poppy, and intensely pink style with maximum customization.
  \`\`\`css
  #${currentLayerName} {
    contrast: 25;
    saturation: 75;
    brightness: 15;
    hue-shift: -25deg;
    vibrance: 45;
    temperature: 10;
  }
  \`\`\`

- "vintage 70s film": A warm, slightly faded, and soft aesthetic with film grain.
  \`\`\`css
  #${currentLayerName} {
    contrast: -15;
    saturation: -20;
    brightness: 8;
    hue-shift: 12deg;
    blur: 0.3px;
    grain: 12;
    temperature: 18;
    vignette: 35;
  }
  \`\`\`

- "cyberpunk neon": A dark, moody style with high-contrast, vibrant blues and magentas.
  \`\`\`css
  #${currentLayerName} {
    contrast: 60;
    saturation: 45;
    brightness: -25;
    hue-shift: -35deg;
    outer-glow: #00FFFF 18px;
    vignette: 55;
    vibrance: 35;
  }
  \`\`\`

- "dramatic film noir": A classic black and white look with extreme contrast.
  \`\`\`css
  #${currentLayerName} {
    contrast: 85;
    saturation: -100;
    brightness: -8;
    drop-shadow: #000 4px 4px 12px;
    grain: 8;
  }
  \`\`\`

- "Wes Anderson pastel": A flat, bright, and muted color palette.
  \`\`\`css
  #${currentLayerName} {
    contrast: -8;
    saturation: -30;
    brightness: 12;
    hue-shift: 8deg;
    temperature: 15;
    vibrance: -10;
  }
  \`\`\`

- "2016 Instagram filter": The classic punchy, high-saturation look.
  \`\`\`css
  #${currentLayerName} {
    contrast: 35;
    saturation: 45;
    brightness: 8;
    hue-shift: -8deg;
    vibrance: 25;
    temperature: -5;
  }
  \`\`\`

Now, process the following user request.
User's style description: "${prompt}"

Return ONLY the CSS code block for the layer selector #${currentLayerName}. Do not include any other text, explanation, or markdown formatting.`
          }]
        }]
      };

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const generatedText = data.candidates[0].content.parts[0].text;
        const cssMatch = generatedText.match(/```css\s*([\s\S]*?)\s*```|(#\w+\s*\{[\s\S]*?\})/);
        
        if (cssMatch) {
          let extractedCSS = (cssMatch[1] || cssMatch[2]).trim();
          updateCssCode(extractedCSS);
        } else {
          updateCssCode(generatedText.trim());
        }
      } else {
        throw new Error('No valid content in Gemini API response');
      }

    } catch (error) {
      console.error('Text generation error:', error);
      addLog(`Error generating CSS: ${error.message}`, "error");
    } finally {
      setIsGenerating(false);
    }
  });


  
  // Removed connectToPhotoshop function - no longer needed

  const handleExport = () => {
    const layers = parseCSSToLayers(cssCode);
    const firstLayerName = Object.keys(layers)[0];
    if (!firstLayerName) {
      addLog("No styles to export.", "warning");
      return;
    }

    const styles = layers[firstLayerName];
    const filterProperties = [];
    let opacity = 1;

    if (styles.blur) filterProperties.push(`blur(${parseFloat(styles.blur)}px)`);
    if (styles.brightness) filterProperties.push(`brightness(${(100 + parseFloat(styles.brightness)) / 100})`);
    if (styles.contrast) filterProperties.push(`contrast(${(100 + parseFloat(styles.contrast)) / 100})`);
    if (styles.saturation) filterProperties.push(`saturate(${(100 + parseFloat(styles.saturation)) / 100})`);
    if (styles['hue-shift']) filterProperties.push(`hue-rotate(${parseFloat(styles['hue-shift'])}deg)`);
    if (styles['drop-shadow']) {
        const shadowParts = styles['drop-shadow'].split(' ').filter(p => p);
        if (shadowParts.length === 4) {
            filterProperties.push(`drop-shadow(${shadowParts[1]} ${shadowParts[2]} ${shadowParts[3]} ${shadowParts[0]})`);
        }
    }
    
    if (styles.opacity) opacity = parseFloat(styles.opacity) / 100;

    const finalCss = `.styled-image {\n  filter: ${filterProperties.join(' ')};\n  opacity: ${opacity};\n}`;
    setExportedCss(finalCss);
    setShowExportModal(true);
    addLog("📦 Exported style to Web CSS", "success");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exportedCss).then(() => {
      addLog("Copied to clipboard!", "success");
    }).catch(err => {
      addLog("Failed to copy to clipboard", "error");
    });
  };

  const copyConsoleToClipboard = () => {
    const consoleText = logs.map(log => `[${log.timestamp}] ${log.message}`).join('\n');
    if (consoleText.trim() === '') {
      addLog("No console messages to copy", "warning");
      return;
    }
    
    navigator.clipboard.writeText(consoleText).then(() => {
      addLog("Console copied to clipboard!", "success");
    }).catch(err => {
      addLog("Failed to copy console to clipboard", "error");
    });
  };

  return (
    <div className="css-editor">
      {/* Export Modal */}
      {showExportModal && (
        <div className="css-editor__modal-backdrop" onClick={() => setShowExportModal(false)}>
          <div className="css-editor__modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Export to Web CSS</h3>
            <p>Use this CSS code to apply a similar style to an image on a website.</p>
            <textarea readOnly value={exportedCss} className="css-editor__textarea css-editor__textarea--modal"></textarea>
            <div className="css-editor__modal-actions">
              <button onClick={copyToClipboard} className="css-editor__button css-editor__button--blue">Copy to Clipboard</button>
              <button onClick={() => setShowExportModal(false)} className="css-editor__button">Close</button>
            </div>
          </div>
        </div>
      )}
      <div className="css-editor__header">
        <div className="css-editor__header-left">
          <img
            src={Chroma}
            alt="logo"
            style={{ width: "15vw", height: "auto" }}
          />
        </div>
        <div className="css-editor__header-right">
          <button onClick={handleExport} className="css-editor__button css-editor__button--blue">📦 Export for Web</button>
          <button onClick={handleSave} className="css-editor__button css-editor__button--green">💾 Save (Ctrl+S)</button>
        </div>
      </div>

      {/* AI Generation Sections */}
      <div className="css-editor__ai-section">
        <div className="css-editor__ai-header">
          <span className="css-editor__icon css-editor__icon--purple">✨</span>
          <h3>Gemini CSS Generation</h3>
        </div>
        <div className="css-editor__ai-content">
          <div className="css-editor__ai-input-group">
            <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the look you want (e.g., 'vintage 70s film')" className="css-editor__text-input" />
            <button onClick={handleGenerateFromText} disabled={isGenerating || isApiRateLimited || !prompt.trim()} className="css-editor__button css-editor__button--purple">
              ✨ {isGenerating ? "Generating..." : "Generate CSS"}
            </button>
          </div>

        </div>
      </div>
      
      <div className="css-editor__ai-section">
        <div className="css-editor__ai-header">
          <span className="css-editor__icon css-editor__icon--blue">🎨</span>
          <h3>Inspiration Image Analysis</h3>
        </div>
        <div className="css-editor__ai-content">
          <div className="css-editor__image-upload">
            <button
              onClick={handleBrowseForImage}
              className="css-editor__upload-button"
              style={{ 
                width: '100%', 
                padding: '1.5rem',
                border: '2px dashed #4b5563',
                borderRadius: '0.5rem',
                background: imagePreview ? '#374151' : '#1f2937',
                color: '#9ca3af',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                minHeight: '120px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {imagePreview ? (
                <div className="css-editor__image-preview">
                  <img src={imagePreview} alt="Inspiration" style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '0.25rem' }} />
                  <span style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Click to change image</span>
                </div>
              ) : (
                <>
                  <span style={{ fontSize: '1.125rem' }}>📸 Browse for Inspiration Image</span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Uses native file picker</span>
                </>
              )}
            </button>
          </div>
          <div className="css-editor__ai-input-group">
            <button onClick={handleGenerateFromImage} disabled={isAnalyzingImage || isApiRateLimited || !inspirationImage} className="css-editor__button css-editor__button--blue">
              🎨 {isAnalyzingImage ? "Analyzing..." : "Extract Style & Generate CSS"}
            </button>
          </div>
        </div>
      </div>

      <div className="css-editor__main">
        <div className="css-editor__editor">
          <div className="css-editor__editor-header">
            <span className="css-editor__icon css-editor__icon--gray">📄</span>
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
        <div className="css-editor__logs">
          <div className="css-editor__logs-header">
            <h3 className="css-editor__logs-title">Console</h3>
            <button 
              onClick={copyConsoleToClipboard} 
              className="css-editor__button css-editor__button--small"
              title="Copy console messages to clipboard"
            >
              📋 Copy
            </button>
          </div>
          <div className="css-editor__logs-content">
            {logs.map((log, index) => (
              <div key={index} className={`css-editor__log css-editor__log--${log.type}`}>
                <span className="css-editor__log-timestamp">[{log.timestamp}]</span> {log.message}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="css-editor__log css-editor__log--empty">No logs yet. Save your CSS to see output.</div>
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
