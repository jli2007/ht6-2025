/**
 * CONTROLLER for handling CSS-to-Photoshop operations
 * Manages communication between React UI and ExtendScript
 */

const { app, core, action } = require("photoshop");

class PhotoshopController {
  constructor() {
    this.isConnected = false;
    this.eventListeners = new Map();
    this.appliedAdjustments = new Map();
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
        saturation: 0,
      }),
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
      saturation: () => ({
        type: "hueAdjustment",
        layerName,
        hue: 0,
        saturation: clamp(value, -100, 100),
      }),
    };

    const operationFactory = operationMap[property.toLowerCase()];
    return operationFactory ? operationFactory() : null;
  }

  /**
   * Find LAYER by name
   */
  findLayerByName(doc, layerName) {
    let layer = doc.layers.find((l) => l.name === layerName);
    if (layer) return layer;

    layer = doc.layers.find((l) => l.name.toLowerCase() === layerName.toLowerCase());
    if (layer) return layer;

    layer = doc.layers.find((l) => l.name.includes(layerName) || layerName.includes(l.name));
    return layer;
  }

  /**
   * Reset layer to original state by removing adjustment layers and effects
   */
  async resetLayerAdjustments(doc, layerName) {
    const adjustmentKey = `${doc.id}_${layerName}`;
    const appliedAdjustments = this.appliedAdjustments.get(adjustmentKey) || [];

    // Find the target layer first to make sure we don't delete it
    const targetLayer = this.findLayerByName(doc, layerName);
    const targetLayerId = targetLayer ? targetLayer.id : null;

    // Remove previously created adjustment layers
    for (const adjustmentId of appliedAdjustments) {
      try {
        // Safety check: don't delete the target layer itself!
        if (adjustmentId === targetLayerId) {
          console.warn(`Skipping deletion of target layer ${layerName} (ID: ${adjustmentId})`);
          continue;
        }

        const adjLayer = doc.layers.find(l => l.id === adjustmentId);
        if (adjLayer && adjLayer.kind === "adjustmentLayer") {
          console.log(`Deleting adjustment layer: ${adjLayer.name} (ID: ${adjustmentId})`);
          await adjLayer.delete();
        } else if (adjLayer) {
          console.warn(`Layer ${adjLayer.name} is not an adjustment layer, skipping deletion`);
        }
      } catch (e) {
        console.warn("Failed to remove adjustment layer:", e);
      }
    }

    // Clear the tracking
    this.appliedAdjustments.delete(adjustmentKey);
  }

  /**
   * Apply CSS operations to Photoshop
   */
  async applyCSSOperations(cssText) {
    const operations = this.parseCSSToOperations(cssText);
    if (!operations.length) {
      this.emit("log", { message: "No valid operations found", type: "warning" });
      return { success: false, operationsCount: 0 };
    }

    let successfulOperations = 0;
    let errors = [];

    try {
      await core.executeAsModal(
        async () => {
          const doc = app.activeDocument;

          // Group operations by layer to handle them efficiently
          const operationsByLayer = {};
          operations.forEach(op => {
            if (!operationsByLayer[op.layerName]) {
              operationsByLayer[op.layerName] = [];
            }
            operationsByLayer[op.layerName].push(op);
          });

          for (const [layerName, layerOps] of Object.entries(operationsByLayer)) {
            try {
              // Find the target layer
              let targetLayer = this.findLayerByName(doc, layerName);
              
              if (!targetLayer) {
                targetLayer = await doc.createLayer({ name: layerName });
                this.emit("log", { message: `Created new layer: ${layerName}`, type: "info" });
              }

              // Reset previous adjustments for this layer
              await this.resetLayerAdjustments(doc, layerName);

              const adjustmentKey = `${doc.id}_${layerName}`;
              const appliedIds = [];

              // Consolidate operations by type to avoid duplicates
              const consolidatedOps = this.consolidateOperations(layerOps);

              // Apply each consolidated operation
              for (const op of consolidatedOps) {
                try {
                  this.emit("log", { message: `Applying ${op.type} to layer: ${layerName}`, type: "info" });

                  // Always set the target layer as active before operations
                  doc.activeLayer = targetLayer;

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
                      this.emit("log", { message: `✓ Applied blur ${op.radius}px to ${layerName}`, type: "success" });
                      successfulOperations++;
                      break;

                    case "opacity":
                      targetLayer.opacity = op.value;
                      this.emit("log", { message: `✓ Set opacity ${op.value}% on ${layerName}`, type: "success" });
                      successfulOperations++;
                      break;

                    case "hueAdjustment":
                      // Create adjustment layer clipped to target layer
                      await action.batchPlay([
                        {
                          _obj: "make",
                          _target: [{ _ref: "adjustmentLayer" }],
                          using: {
                            _obj: "adjustmentLayer",
                            type: {
                              _obj: "hueSaturation",
                              adjustment: [{
                                hue: op.hue || 0,
                                saturation: op.saturation || 0,
                                lightness: 0,
                              }]
                            }
                          },
                          _options: { dialogOptions: "dontDisplay" }
                        }
                      ], { synchronousExecution: false });
                      
                      const hueAdjLayer = doc.activeLayer;
                      appliedIds.push(hueAdjLayer.id);
                      
                      // Move adjustment layer directly above target layer
                      await hueAdjLayer.move(targetLayer, "placeBefore");
                      
                      // Set as active and clip to layer below
                      doc.activeLayer = hueAdjLayer;
                      await action.batchPlay([
                        {
                          _obj: "groupEvent",
                          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                          _options: { dialogOptions: "dontDisplay" }
                        }
                      ], { synchronousExecution: false });
                      
                      this.emit("log", { message: `✓ Applied hue/saturation adjustment to ${layerName}`, type: "success" });
                      successfulOperations++;
                      break;

                    case "brightnessContrast":
                      // Create adjustment layer clipped to target layer
                      await action.batchPlay([
                        {
                          _obj: "make",
                          _target: [{ _ref: "adjustmentLayer" }],
                          using: {
                            _obj: "adjustmentLayer",
                            type: {
                              _obj: "brightnessContrast",
                              brightness: op.brightness || 0,
                              contrast: op.contrast || 0,
                            }
                          },
                          _options: { dialogOptions: "dontDisplay" }
                        }
                      ], { synchronousExecution: false });
                      
                      const bcAdjLayer = doc.activeLayer;
                      appliedIds.push(bcAdjLayer.id);
                      
                      // Move adjustment layer directly above target layer
                      await bcAdjLayer.move(targetLayer, "placeBefore");
                      
                      // Set as active and clip to layer below
                      doc.activeLayer = bcAdjLayer;
                      await action.batchPlay([
                        {
                          _obj: "groupEvent",
                          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                          _options: { dialogOptions: "dontDisplay" }
                        }
                      ], { synchronousExecution: false });
                      
                      this.emit("log", { message: `✓ Applied brightness/contrast adjustment to ${layerName}`, type: "success" });
                      successfulOperations++;
                      break;

                    default:
                      this.emit("log", { message: `⚠ Unsupported operation: ${op.type}`, type: "warning" });
                  }
                } catch (opError) {
                  const errorMsg = `Failed to apply ${op.type} to ${layerName}: ${opError.message}`;
                  errors.push(errorMsg);
                  this.emit("log", { message: `✗ ${errorMsg}`, type: "error" });
                }
              }

              // Store applied adjustment layer IDs for future cleanup
              if (appliedIds.length > 0) {
                this.appliedAdjustments.set(adjustmentKey, appliedIds);
              }

            } catch (layerError) {
              const errorMsg = `Failed to process layer ${layerName}: ${layerError.message}`;
              errors.push(errorMsg);
              this.emit("log", { message: `✗ ${errorMsg}`, type: "error" });
            }
          }
        },
        { commandName: "Apply CSS Operations" }
      );
    } catch (e) {
      if (e.number === 9) {
        this.emit("log", { message: "Modal conflict - another modal is active", type: "error" });
      } else {
        this.emit("log", { message: `Photoshop error: ${e.message}`, type: "error" });
      }
      errors.push(e.message);
    }

    // Summary message
    if (errors.length > 0) {
      this.emit("log", { 
        message: `Completed with ${successfulOperations} successful operations, ${errors.length} errors`, 
        type: "warning" 
      });
    } else {
      this.emit("log", { 
        message: `✅ Successfully applied ${successfulOperations} operations`, 
        type: "success" 
      });
    }

    return { 
      success: errors.length === 0, 
      operationsCount: successfulOperations,
      errors: errors 
    };
  }

  /**
   * Consolidate operations to combine similar adjustment types and avoid duplicates
   */
  consolidateOperations(operations) {
    const consolidated = [];
    const adjustmentMap = new Map();

    operations.forEach(op => {
      switch (op.type) {
        case "hueAdjustment":
          if (!adjustmentMap.has("hueAdjustment")) {
            adjustmentMap.set("hueAdjustment", { 
              type: "hueAdjustment", 
              layerName: op.layerName, 
              hue: 0, 
              saturation: 0 
            });
          }
          const hueAdj = adjustmentMap.get("hueAdjustment");
          hueAdj.hue += op.hue || 0;
          hueAdj.saturation += op.saturation || 0;
          break;

        case "brightnessContrast":
          if (!adjustmentMap.has("brightnessContrast")) {
            adjustmentMap.set("brightnessContrast", { 
              type: "brightnessContrast", 
              layerName: op.layerName, 
              brightness: 0, 
              contrast: 0 
            });
          }
          const bcAdj = adjustmentMap.get("brightnessContrast");
          bcAdj.brightness += op.brightness || 0;
          bcAdj.contrast += op.contrast || 0;
          break;

        default:
          // For blur, opacity and other operations, just add them directly
          consolidated.push(op);
      }
    });

    // Add consolidated adjustments
    adjustmentMap.forEach(adj => {
      consolidated.push(adj);
    });

    return consolidated;
  }

  /**
   * Clear all applied adjustments
   */
  async clearAllAdjustments() {
    try {
      await core.executeAsModal(async () => {
        const doc = app.activeDocument;
        
        for (const [key, adjustmentIds] of this.appliedAdjustments.entries()) {
          for (const adjustmentId of adjustmentIds) {
            try {
              const adjLayer = doc.layers.find(l => l.id === adjustmentId);
              if (adjLayer) {
                await adjLayer.delete();
              }
            } catch (e) {
              console.warn("Failed to remove adjustment layer:", e);
            }
          }
        }
        
        this.appliedAdjustments.clear();
      }, { commandName: "Clear All CSS Adjustments" });
    } catch (e) {
      console.error("Error clearing adjustments:", e);
      throw e;
    }
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