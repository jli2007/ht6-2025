// components/CSSEditor.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Save, Play, Layers, Code2 } from 'lucide-react';
import './Terminal.css';

export const Terminal = () => {
  const [cssCode, setCssCode] = useState(`#layer1 {
  blur: 10;
  opacity: 80;
  hue: 15;
}

#layer2 {
  blur: 5;
  opacity: 90;
  brightness: 120;
}`);
  
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState([]);
  const textareaRef = useRef(null);
  
  // Add log function
  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
  };

  // Parse CSS to extract layer styles
  const parseCSSToLayers = (css) => {
    const layers = {};
    const rules = css.match(/#[^{]+\{[^}]+\}/g) || [];
    
    rules.forEach(rule => {
      const [selector, styles] = rule.split('{');
      const layerName = selector.trim().substring(1); // Remove #
      const styleString = styles.replace('}', '').trim();
      
      const layerStyles = {};
      styleString.split(';').forEach(style => {
        const [property, value] = style.split(':').map(s => s.trim());
        if (property && value) {
          layerStyles[property] = parseFloat(value) || value;
        }
      });
      
      layers[layerName] = layerStyles;
    });
    
    return layers;
  };

  // Convert CSS properties to Photoshop operations
  const convertToPhotoshopOperations = (layers) => {
    const operations = [];
    
    Object.entries(layers).forEach(([layerName, styles]) => {
      operations.push({
        type: 'selectLayer',
        layerName: layerName
      });
      
      // Convert each CSS property to Photoshop operation
      Object.entries(styles).forEach(([property, value]) => {
        switch(property) {
          case 'blur':
            operations.push({
              type: 'gaussianBlur',
              radius: value,
              layerName: layerName
            });
            break;
          case 'opacity':
            operations.push({
              type: 'opacity',
              value: value,
              layerName: layerName
            });
            break;
          case 'hue':
            operations.push({
              type: 'hueAdjustment',
              hue: value,
              layerName: layerName
            });
            break;
          case 'brightness':
            operations.push({
              type: 'brightnessContrast',
              brightness: value,
              layerName: layerName
            });
            break;
          case 'contrast':
            operations.push({
              type: 'brightnessContrast',
              contrast: value,
              layerName: layerName
            });
            break;
        }
      });
    });
    
    return operations;
  };

  // Generate ExtendScript code
  const generateExtendScript = (operations) => {
    let script = `// Auto-generated ExtendScript for Photoshop
#target photoshop

try {
  if (!app.documents.length) {
    alert("No document is open!");
  } else {
    var doc = app.activeDocument;
    
`;

    operations.forEach(op => {
      switch(op.type) {
        case 'selectLayer':
          script += `    // Select layer: ${op.layerName}
    try {
      doc.activeLayer = doc.layers.getByName("${op.layerName}");
    } catch(e) {
      // Layer doesn't exist, create it
      doc.artLayers.add();
      doc.activeLayer.name = "${op.layerName}";
    }
    
`;
          break;
        case 'gaussianBlur':
          script += `    // Apply Gaussian Blur: ${op.radius}px
    doc.activeLayer.applyGaussianBlur(${op.radius});
    
`;
          break;
        case 'opacity':
          script += `    // Set Opacity: ${op.value}%
    doc.activeLayer.opacity = ${op.value};
    
`;
          break;
        case 'hueAdjustment':
          script += `    // Apply Hue Adjustment: ${op.hue}
    var hueLayer = doc.adjustmentLayers.add(AdjustmentReference.HUESATURATION);
    hueLayer.adjustmentLayer.hue = ${op.hue};
    
`;
          break;
        case 'brightnessContrast':
          script += `    // Apply Brightness/Contrast
    var bcLayer = doc.adjustmentLayers.add(AdjustmentReference.BRIGHTNESSCONTRAST);`;
          if (op.brightness) script += `
    bcLayer.adjustmentLayer.brightness = ${op.brightness - 100};`;
          if (op.contrast) script += `
    bcLayer.adjustmentLayer.contrast = ${op.contrast - 100};`;
          script += `
    
`;
          break;
      }
    });

    script += `  }
} catch(error) {
  alert("Error: " + error.message);
}`;

    return script;
  };

  // Handle save (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [cssCode]);

  const handleSave = async () => {
    try {
      addLog('Parsing CSS...', 'info');
      const layers = parseCSSToLayers(cssCode);
      
      addLog(`Found ${Object.keys(layers).length} layers`, 'info');
      
      const operations = convertToPhotoshopOperations(layers);
      const extendScript = generateExtendScript(operations);
      
      addLog('Generated ExtendScript', 'info');
      
      // In a real plugin, you would send this to Photoshop via UXP
      // For now, we'll simulate the process
      await simulatePhotoshopExecution(extendScript, layers);
      
    } catch (error) {
      addLog(`Error: ${error.message}`, 'error');
    }
  };

  // Simulate Photoshop execution
  const simulatePhotoshopExecution = async (script, layers) => {
    addLog('Sending to Photoshop...', 'info');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    Object.entries(layers).forEach(([layerName, styles]) => {
      addLog(`Applied styles to ${layerName}: ${Object.keys(styles).join(', ')}`, 'success');
    });
    
    addLog('HMR complete - Photoshop updated!', 'success');
  };

  const handleRun = () => {
    handleSave();
  };

  const connectToPhotoshop = () => {
    setIsConnected(true);
    addLog('Connected to Photoshop via UXP', 'success');
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
          <div className={`css-editor__status ${isConnected ? 'css-editor__status--connected' : 'css-editor__status--disconnected'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
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