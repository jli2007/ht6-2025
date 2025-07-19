/**
 * CONTROLLER for handling CSS-to-Photoshop operations
 * Manages communication between React UI and ExtendScript
 */

const { app, core, action } = require("photoshop");

class PhotoshopController {
  constructor() {
    this.isConnected = false;
    this.eventListeners = new Map();
    this.init();
  }

  /**
   * Initialize the controller
   */
  init() {
    this.setupUXPCommunication();
    this.checkPhotoshopConnection();
  }

  /**
   * Setup UXP communication channels
   */
  setupUXPCommunication() {
    // Listen for messages from ExtendScript
    if (typeof window !== "undefined" && window.postMessage) {
      window.addEventListener("message", (event) => {
        this.handleExtendScriptMessage(event.data);
      });
    }
  }

  /**
   * Get all available layer names for debugging
   */
  async getAllLayerNames() {
    try {
      if (typeof app === "undefined" || !app.activeDocument) {
        return [];
      }
      
      const doc = app.activeDocument;
      const layerNames = [];
      
      // Get all layers recursively
      const getAllLayers = (layers) => {
        for (let i = 0; i < layers.length; i++) {
          const layer = layers[i];
          layerNames.push(layer.name);
          
          // If it's a group, get its layers too
          if (layer.layers) {
            getAllLayers(layer.layers);
          }
        }
      };
      
      getAllLayers(doc.layers);
      console.log("Available layers:", layerNames);
      return layerNames;
      
    } catch (error) {
      console.error("Failed to get layer names:", error);
      return [];
    }
  }

  /**
   * Ensure we have an active layer selected
   */
  async ensureActiveLayer() {
    try {
      if (typeof app === "undefined" || !app.activeDocument) {
        return false;
      }
      
      const doc = app.activeDocument;
      
      // If there's already an active layer, we're good
      if (doc.activeLayer) {
        console.log("Active layer already set:", doc.activeLayer.name);
        return true;
      }
      
      // If no active layer but we have layers, set the first one as active
      if (doc.layers && doc.layers.length > 0) {
        doc.activeLayer = doc.layers[0];
        console.log("Set active layer to:", doc.layers[0].name);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error("Failed to ensure active layer:", error);
      return false;
    }
  }

  /**
   * Get the current active layer name
   */
  async getCurrentLayerName() {
    try {
      console.log("Getting current layer name...");
      
      if (typeof app === "undefined") {
        console.warn("Photoshop app object not available");
        return "layer1";
      }
      
      if (!app.activeDocument) {
        console.warn("No active document found");
        return "layer1";
      }
      
      const doc = app.activeDocument;
      console.log("Active document found:", doc.name);
      
      // First try to get the active layer
      if (doc.activeLayer) {
        const layerName = doc.activeLayer.name;
        console.log("Active layer found:", layerName);
        return layerName;
      }
      
      // If no active layer, try to get the first available layer
      if (doc.layers && doc.layers.length > 0) {
        const firstLayer = doc.layers[0];
        console.log("No active layer, using first layer:", firstLayer.name);
        return firstLayer.name;
      }
      
      console.warn("No layers found in document");
      return "layer1";
      
    } catch (error) {
      console.error("Failed to get current layer name:", error);
      return "layer1"; // fallback
    }
  }

  /**
   * Check if Photoshop is available and has an open document
   */
  async checkPhotoshopConnection() {
    try {
      if (typeof app !== "undefined" && app.documents.length > 0) {
        this.isConnected = true;
        this.emit("connectionChanged", { connected: true });
        return true;
      }
    } catch (error) {
      console.warn("Photoshop connection check failed:", error);
    }

    this.isConnected = false;
    this.emit("connectionChanged", { connected: false });
    return false;
  }

  /**
   * Parse CSS string into layer operations
   */
  parseCSSToOperations(cssText) {
    const operations = [];
    const rules = this.extractCSSRules(cssText);
    console.log("Extracted CSS rules:", rules);

    rules.forEach((rule) => {
      const { selector, properties } = rule;
      const layerName = selector.replace("#", "").trim();
      console.log(`Processing layer: ${layerName}`, properties);

      // Convert each CSS property to Photoshop operation
      Object.entries(properties).forEach(([property, value]) => {
        console.log(`Converting property: ${property} = ${value}`);
        const operation = this.convertCSSPropertyToOperation(
          layerName,
          property,
          value
        );
        console.log(`Operation result:`, operation);
        if (operation) {
          // Handle both single operations and arrays of operations (from filter parsing)
          if (Array.isArray(operation)) {
            operations.push(...operation);
          } else {
            operations.push(operation);
          }
        }
      });
    });

    console.log("Final operations array:", operations);
    return operations;
  }

  /**
   * Extract CSS rules from text
   */
  extractCSSRules(cssText) {
    const rules = [];
    const ruleMatches = cssText.match(/#[^{]+\{[^}]+\}/g) || [];

    ruleMatches.forEach((ruleText) => {
      const [selectorPart, propertiesPart] = ruleText.split("{");
      const selector = selectorPart.trim();
      const propertiesText = propertiesPart.replace("}", "").trim();

      const properties = {};
      propertiesText.split(";").forEach((propertyText) => {
        const [prop, val] = propertyText.split(":").map((s) => s.trim());
        if (prop && val) {
          properties[prop] = this.parsePropertyValue(val);
        }
      });

      rules.push({ selector, properties });
    });

    return rules;
  }

  /**
   * Parse CSS property value with precise control
   */
  parsePropertyValue(value) {
    // Handle different value types
    if (typeof value === 'string') {
      // Remove units and convert to number if possible
      const numericValue = parseFloat(value);
      if (!isNaN(numericValue)) {
        return numericValue;
      }
      
      // Handle opacity values (0.0 to 1.0)
      if (value.includes('%')) {
        return parseFloat(value) / 100;
      }
      
      // Handle color values
      if (value.startsWith('#')) {
        return value;
      }
      
      // Handle quoted strings (for blending modes)
      if (value.startsWith("'") || value.startsWith('"')) {
        return value.slice(1, -1);
      }
      
      return value;
    }
    
    return value;
  }

  /**
   * Parse shadow value (e.g., "#000 5px 5px 10px")
   */
  parseShadowValue(value) {
    const parts = value.toString().split(' ');
    return {
      color: parts[0] || '#000000',
      x: parseFloat(parts[1]) || 0,
      y: parseFloat(parts[2]) || 0,
      blur: parseFloat(parts[3]) || 0,
    };
  }

  /**
   * Parse glow value (e.g., "#FFF 15px")
   */
  parseGlowValue(value) {
    const parts = value.toString().split(' ');
    return {
      color: parts[0] || '#FFFFFF',
      size: parseFloat(parts[1]) || 10,
    };
  }

  /**
   * Parse stroke value (e.g., "3px outside #FFF")
   */
  parseStrokeValue(value) {
    const parts = value.toString().split(' ');
    return {
      size: parseFloat(parts[0]) || 1,
      position: parts[1] || 'outside',
      color: parts[2] || '#000000',
    };
  }

  /**
   * Parse color overlay value (e.g., "#A52A2A 50%")
   */
  parseColorOverlayValue(value) {
    const parts = value.toString().split(' ');
    return {
      color: parts[0] || '#000000',
      opacity: parseFloat(parts[1]) || 100,
    };
  }

  /**
   * Parse gradient overlay value (e.g., "linear 90deg #F00 #00F")
   */
  parseGradientOverlayValue(value) {
    const parts = value.toString().split(' ');
    return {
      type: parts[0] || 'linear',
      angle: parseFloat(parts[1]) || 0,
      color1: parts[2] || '#FF0000',
      color2: parts[3] || '#0000FF',
    };
  }

  /**
   * Parse standard CSS filter property and convert to our operations
   */
  parseCSSFilter(layerName, filterValue) {
    const operations = [];
    const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
    
    // Parse brightness filter: brightness(1.07) -> brightness: 7
    const brightnessMatch = filterValue.match(/brightness\(([^)]+)\)/);
    if (brightnessMatch) {
      const brightnessValue = parseFloat(brightnessMatch[1]);
      const adjustedValue = Math.round((brightnessValue - 1) * 100);
      operations.push({
        type: "brightnessContrast",
        layerName,
        brightness: clamp(adjustedValue, -100, 100),
        contrast: 0,
      });
    }
    
    // Parse contrast filter: contrast(1.07) -> contrast: 7
    const contrastMatch = filterValue.match(/contrast\(([^)]+)\)/);
    if (contrastMatch) {
      const contrastValue = parseFloat(contrastMatch[1]);
      const adjustedValue = Math.round((contrastValue - 1) * 100);
      operations.push({
        type: "brightnessContrast",
        layerName,
        brightness: 0,
        contrast: clamp(adjustedValue, -100, 100),
      });
    }
    
    // Parse saturate filter: saturate(0.98) -> saturation: -2
    const saturateMatch = filterValue.match(/saturate\(([^)]+)\)/);
    if (saturateMatch) {
      const saturateValue = parseFloat(saturateMatch[1]);
      const adjustedValue = Math.round((saturateValue - 1) * 100);
      operations.push({
        type: "hueSaturation",
        layerName,
        hue: 0,
        saturation: clamp(adjustedValue, -100, 100),
        lightness: 0,
      });
    }
    
    // Parse hue-rotate filter: hue-rotate(45deg) -> hue-shift: 45
    const hueRotateMatch = filterValue.match(/hue-rotate\(([^)]+)\)/);
    if (hueRotateMatch) {
      const hueValue = parseFloat(hueRotateMatch[1]);
      operations.push({
        type: "hueSaturation",
        layerName,
        hue: clamp(hueValue, -180, 180),
        saturation: 0,
        lightness: 0,
      });
    }
    
    // Parse blur filter: blur(2px) -> blur: 2
    const blurMatch = filterValue.match(/blur\(([^)]+)\)/);
    if (blurMatch) {
      const blurValue = parseFloat(blurMatch[1]);
      operations.push({
        type: "gaussianBlur",
        layerName,
        radius: Math.max(0, blurValue),
      });
    }
    
    return operations.length > 0 ? operations : null;
  }

  /**
   * Convert CSS property to Photoshop operation
   */
  convertCSSPropertyToOperation(layerName, property, value) {
    const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
    
    // Handle standard CSS filter property
    if (property.toLowerCase() === 'filter') {
      return this.parseCSSFilter(layerName, value);
    }
    
    const operationMap = {
      // Basic Layer Properties
      opacity: () => ({
        type: "opacity",
        layerName,
        value: clamp(value, 0, 100),
      }),
      'blending-mode': () => ({
        type: "blendingMode",
        layerName,
        mode: value,
      }),
      'fill-opacity': () => ({
        type: "fillOpacity",
        layerName,
        value: clamp(value, 0, 100),
      }),

      // Color & Tone Adjustments
      brightness: () => ({
        type: "brightnessContrast",
        layerName,
        brightness: clamp(value, -100, 100),
        contrast: 0,
      }),
      contrast: () => ({
        type: "brightnessContrast",
        layerName,
        brightness: 0,
        contrast: clamp(value, -100, 100),
      }),
      exposure: () => ({
        type: "exposure",
        layerName,
        value: clamp(value, -20, 20),
      }),
      saturation: () => ({
        type: "hueSaturation",
        layerName,
        hue: 0,
        saturation: clamp(value, -100, 100),
        lightness: 0,
      }),
      'hue-shift': () => ({
        type: "hueSaturation",
        layerName,
        hue: clamp(value, -180, 180),
        saturation: 0,
        lightness: 0,
      }),
      vibrance: () => ({
        type: "vibrance",
        layerName,
        value: clamp(value, -100, 100),
      }),
      temperature: () => ({
        type: "temperature",
        layerName,
        value: clamp(value, -100, 100),
      }),
      tint: () => ({
        type: "tint",
        layerName,
        value: clamp(value, -100, 100),
      }),

      // Layer Effects
      'drop-shadow': () => ({
        type: "dropShadow",
        layerName,
        ...this.parseShadowValue(value),
      }),
      'inner-shadow': () => ({
        type: "innerShadow",
        layerName,
        ...this.parseShadowValue(value),
      }),
      'outer-glow': () => ({
        type: "outerGlow",
        layerName,
        ...this.parseGlowValue(value),
      }),
      stroke: () => ({
        type: "stroke",
        layerName,
        ...this.parseStrokeValue(value),
      }),
      'color-overlay': () => ({
        type: "colorOverlay",
        layerName,
        ...this.parseColorOverlayValue(value),
      }),
      'gradient-overlay': () => ({
        type: "gradientOverlay",
        layerName,
        ...this.parseGradientOverlayValue(value),
      }),

      // Filters & Textures
      blur: () => ({
        type: "gaussianBlur",
        layerName,
        radius: Math.max(0, value),
      }),
      sharpen: () => ({
        type: "sharpen",
        layerName,
        value: clamp(value, 0, 100),
      }),
      noise: () => ({
        type: "noise",
        layerName,
        value: clamp(value, 0, 100),
      }),
      grain: () => ({
        type: "noise", // grain is same as noise
        layerName,
        value: clamp(value, 0, 100),
      }),
      vignette: () => ({
        type: "vignette",
        layerName,
        value: clamp(value, 0, 100),
      }),

      // Legacy support for old property names
      hue: () => ({
        type: "hueSaturation",
        layerName,
        hue: clamp(value, -180, 180),
        saturation: 0,
        lightness: 0,
      }),
    };

    const operationFactory = operationMap[property.toLowerCase()];
    return operationFactory ? operationFactory() : null;
  }

  /**
   * Apply CSS operations to Photoshop
   */
  async applyCSSOperations(cssText) {
    console.log("Parsing CSS text:", cssText);
    const operations = this.parseCSSToOperations(cssText);
    console.log("Parsed operations:", operations);
    if (!operations.length) throw new Error("No valid operations found");

    try {
      await core.executeAsModal(
        async () => {
          const doc = app.activeDocument;

          for (const op of operations) {
            const layer =
              doc.layers.find((l) => l.name === op.layerName) ||
              (await doc.createLayer({ name: op.layerName }));
            doc.activeLayer = layer;

            switch (op.type) {
              case "gaussianBlur":
                await action.batchPlay(
                  [
                    {
                      _obj: "gaussianBlur",
                      radius: { _unit: "pixelsUnit", _value: op.radius },
                      _options: { dialogOptions: "dontDisplay" },
                    },
                  ],
                  { synchronousExecution: false }
                );
                break;

              case "opacity":
                layer.opacity = op.value;
                break;

              case "blendingMode":
                layer.blendMode = op.mode;
                break;

              case "fillOpacity":
                layer.fillOpacity = op.value;
                break;

              case "hueSaturation":
                await action.batchPlay(
                  [
                    {
                      _obj: "hueSaturation",
                      adjustment: [
                        {
                          hue: op.hue || 0,
                          saturation: op.saturation || 0,
                          lightness: op.lightness || 0,
                        }
                      ],
                      _options: { dialogOptions: "dontDisplay" },
                    },
                  ],
                  { synchronousExecution: false }
                );
                break;

              case "brightnessContrast":
                await action.batchPlay(
                  [
                    {
                      _obj: "brightnessContrast",
                      brightness: op.brightness || 0,
                      contrast: op.contrast || 0,
                      _options: { dialogOptions: "dontDisplay" },
                    },
                  ],
                  { synchronousExecution: false }
                );
                break;

              case "exposure":
                await action.batchPlay(
                  [
                    {
                      _obj: "exposure",
                      exposure: op.value,
                      _options: { dialogOptions: "dontDisplay" },
                    },
                  ],
                  { synchronousExecution: false }
                );
                break;

              case "vibrance":
                await action.batchPlay(
                  [
                    {
                      _obj: "vibrance",
                      vibrance: op.value,
                      _options: { dialogOptions: "dontDisplay" },
                    },
                  ],
                  { synchronousExecution: false }
                );
                break;

              case "temperature":
                await action.batchPlay(
                  [
                    {
                      _obj: "temperature",
                      temperature: op.value,
                      _options: { dialogOptions: "dontDisplay" },
                    },
                  ],
                  { synchronousExecution: false }
                );
                break;

              case "tint":
                await action.batchPlay(
                  [
                    {
                      _obj: "tint",
                      tint: op.value,
                      _options: { dialogOptions: "dontDisplay" },
                    },
                  ],
                  { synchronousExecution: false }
                );
                break;

              case "dropShadow":
                await action.batchPlay(
                  [
                    {
                      _obj: "dropShadow",
                      color: op.color,
                      x: op.x,
                      y: op.y,
                      blur: op.blur,
                      _options: { dialogOptions: "dontDisplay" },
                    },
                  ],
                  { synchronousExecution: false }
                );
                break;

              case "innerShadow":
                await action.batchPlay(
                  [
                    {
                      _obj: "innerShadow",
                      color: op.color,
                      x: op.x,
                      y: op.y,
                      blur: op.blur,
                      _options: { dialogOptions: "dontDisplay" },
                    },
                  ],
                  { synchronousExecution: false }
                );
                break;

              case "outerGlow":
                await action.batchPlay(
                  [
                    {
                      _obj: "outerGlow",
                      color: op.color,
                      size: op.size,
                      _options: { dialogOptions: "dontDisplay" },
                    },
                  ],
                  { synchronousExecution: false }
                );
                break;

              case "stroke":
                await action.batchPlay(
                  [
                    {
                      _obj: "stroke",
                      size: op.size,
                      position: op.position,
                      color: op.color,
                      _options: { dialogOptions: "dontDisplay" },
                    },
                  ],
                  { synchronousExecution: false }
                );
                break;

              case "colorOverlay":
                await action.batchPlay(
                  [
                    {
                      _obj: "colorOverlay",
                      color: op.color,
                      opacity: op.opacity,
                      _options: { dialogOptions: "dontDisplay" },
                    },
                  ],
                  { synchronousExecution: false }
                );
                break;

              case "gradientOverlay":
                await action.batchPlay(
                  [
                    {
                      _obj: "gradientOverlay",
                      type: op.type,
                      angle: op.angle,
                      color1: op.color1,
                      color2: op.color2,
                      _options: { dialogOptions: "dontDisplay" },
                    },
                  ],
                  { synchronousExecution: false }
                );
                break;

              case "sharpen":
                await action.batchPlay(
                  [
                    {
                      _obj: "sharpen",
                      amount: op.value,
                      _options: { dialogOptions: "dontDisplay" },
                    },
                  ],
                  { synchronousExecution: false }
                );
                break;

              case "noise":
                await action.batchPlay(
                  [
                    {
                      _obj: "addNoise",
                      amount: op.value,
                      _options: { dialogOptions: "dontDisplay" },
                    },
                  ],
                  { synchronousExecution: false }
                );
                break;

              case "vignette":
                await action.batchPlay(
                  [
                    {
                      _obj: "vignette",
                      amount: op.value,
                      _options: { dialogOptions: "dontDisplay" },
                    },
                  ],
                  { synchronousExecution: false }
                );
                break;

              default:
                console.warn("Unsupported operation", op);
            }
          }
        },
        { commandName: "Apply CSS Operations" }
      );
    } catch (e) {
      if (e.number === 9) {
        console.error("Modal conflict—another modal is active:", e);
      } else {
        console.error("Error in executeAsModal:", e);
      }
      this.emit("error", { error: e.message });
      throw e;
    }
    return { success: true, operationsCount: operations.length };
  }

  /**
   * Generate ExtendScript for a specific layer
   */
  generateLayerScript(layerName, operations) {
    let script = `
        // Operations for layer: ${layerName}
        try {
            var layer = doc.layers.getByName("${layerName}");
            doc.activeLayer = layer;
        } catch (e) {
            var layer = doc.artLayers.add();
            layer.name = "${layerName}";
            doc.activeLayer = layer;
        }
        
        `;

    operations.forEach((op) => {
      script += this.generateOperationScript(op);
    });

    return script;
  }

  /**
   * Generate ExtendScript for individual operation
   */
  generateOperationScript(operation) {
    switch (operation.type) {
      case "gaussianBlur":
        return `doc.activeLayer.applyGaussianBlur(${operation.radius});\n`;

      case "opacity":
        return `doc.activeLayer.opacity = ${operation.value};\n`;

      case "hueAdjustment":
        return `doc.activeLayer.applyHueSaturation(${operation.hue || 0}, ${operation.saturation || 0}, 0);\n`;

      case "brightnessContrast":
        return `doc.activeLayer.applyBrightnessContrast(${
          operation.brightness || 0
        }, ${operation.contrast || 0});\n`;

      default:
        return `// Unknown operation: ${operation.type}\n`;
    }
  }

  /**
   * Handle messages from ExtendScript
   */
  handleExtendScriptMessage(message) {
    const { type, data } = message;
    this.emit(type, data);
  }

  /**
   * Event system
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      hasDocument: this.isConnected && app.documents.length > 0,
    };
  }
}

// Export singleton instance
const photoshopController = new PhotoshopController();
export default photoshopController;