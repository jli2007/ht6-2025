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

    rules.forEach((rule) => {
      const { selector, properties } = rule;
      const layerName = selector.replace("#", "").trim();

      // Convert each CSS property to Photoshop operation
      Object.entries(properties).forEach(([property, value]) => {
        const operation = this.convertCSSPropertyToOperation(
          layerName,
          property,
          value
        );
        if (operation) {
          operations.push(operation);
        }
      });
    });

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
   * Parse CSS property value
   */
  parsePropertyValue(value) {
    // Remove units and convert to number if possible
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      return numericValue;
    }
    return value;
  }

  /**
   * Convert CSS property to Photoshop operation
   */
  convertCSSPropertyToOperation(layerName, property, value) {
    const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
    const operationMap = {
      blur: () => ({
        type: "gaussianBlur",
        layerName,
        radius: Math.max(0, value),
      }),
      opacity: () => ({
        type: "opacity",
        layerName,
        value: clamp(value, 0, 100),
      }),
      hue: () => ({
        type: "hueAdjustment",
        layerName,
        hue: clamp(value, -180, 180),
        saturation: 0, // Add default saturation
      }),
      brightness: () => ({
        type: "brightnessContrast",
        layerName,
        brightness: clamp(value, -100, 100),
        contrast: 0, // Add default contrast
      }),
      contrast: () => ({
        type: "brightnessContrast",
        layerName,
        brightness: 0, // Add default brightness
        contrast: clamp(value, -100, 100),
      }),
      saturation: () => ({
        type: "hueAdjustment",
        layerName,
        hue: 0, // Add default hue
        saturation: clamp(value, -100, 100),
      }),
    };

    const operationFactory = operationMap[property.toLowerCase()];
    return operationFactory ? operationFactory() : null;
  }

  /**
   * Apply CSS operations to Photoshop
   */
  async applyCSSOperations(cssText) {
    const operations = this.parseCSSToOperations(cssText);
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

              case "hueAdjustment":
                await action.batchPlay(
                  [
                    {
                      _obj: "hueSaturation",
                      adjustment: [
                        {
                          hue: op.hue || 0,
                          saturation: op.saturation || 0,
                          lightness: 0,
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
                      _obj: "brightnessContrast", // FIXED: was "brightnessEvent"
                      brightness: op.brightness || 0,
                      contrast: op.contrast || 0,
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