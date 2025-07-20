/**
 * CONTROLLER for handling CSS-to-Photoshop operations
 * Manages communication between React UI and Photoshop
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
    this.checkPhotoshopConnection();
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
    if (typeof value === "string") {
      // Handle percentage values
      if (value.includes("%")) {
        return parseFloat(value);
      }

      // Handle pixel values (e.g., "0.3px", "2px")
      if (value.includes("px")) {
        return parseFloat(value);
      }

      // Handle degree values (e.g., "45deg")
      if (value.includes("deg")) {
        return parseFloat(value);
      }

      const numericValue = parseFloat(value);
      if (!isNaN(numericValue)) {
        // If it's a decimal between 0-1 and no units, convert to percentage
        if (
          numericValue >= 0 &&
          numericValue <= 1 &&
          !value.includes("px") &&
          !value.includes("deg")
        ) {
          return numericValue * 100; // Convert 0.1 to 10
        }
        return numericValue;
      }

      // Handle color values
      if (value.startsWith("#")) {
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
    if (property.toLowerCase() === "filter") {
      return this.parseCSSFilter(layerName, value);
    }

    const operationMap = {
      // Basic Layer Properties
      opacity: () => ({
        type: "opacity",
        layerName,
        value: clamp(value, 0, 100),
      }),
      "blending-mode": () => ({
        type: "blendingMode",
        layerName,
        hue: clamp(value, -180, 180),
        saturation: 0,
      }),
      "fill-opacity": () => ({
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
        type: "brightnessContrast", // Use brightness/contrast as fallback for exposure
        layerName,
        brightness: clamp(value, -100, 100),
        contrast: 0,
      }),
      "hue-shift": () => ({
        type: "hueSaturation",
        layerName,
        hue: clamp(value, -180, 180),
        saturation: 0,
        lightness: 0,
      }),
      saturation: () => ({
        type: "hueSaturation",
        layerName,
        hue: 0,
        saturation: clamp(value, -100, 100),
        lightness: 0,
      }),
      vibrance: () => ({
        type: "vibrance",
        layerName,
        value: clamp(value, -100, 100),
      }),
      temperature: () => ({
        type: "hueSaturation", // Use hue/saturation as fallback for temperature
        layerName,
        hue: clamp(value * 0.5, -90, 90), // Convert temperature to hue shift
        saturation: 0,
        lightness: 0,
      }),
      tint: () => ({
        type: "hueSaturation", // Use hue/saturation as fallback for tint
        layerName,
        hue: clamp(value * 0.5, -90, 90), // Convert tint to hue shift
        saturation: 0,
        lightness: 0,
      }),

      // Filters & Textures
      blur: () => ({
        type: "gaussianBlur",
        layerName,
        radius: Math.max(0, value),
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
        type: "brightnessContrast", // Use brightness/contrast as fallback for vignette
        layerName,
        brightness: -clamp(value * 0.3, 0, 30), // Simulate vignette with brightness
        contrast: clamp(value * 0.2, 0, 20),
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
   * Find LAYER by name
   */
  findLayerByName(doc, layerName) {
    let layer = doc.layers.find((l) => l.name === layerName);
    if (layer) return layer;

    layer = doc.layers.find(
      (l) => l.name.toLowerCase() === layerName.toLowerCase()
    );
    if (layer) return layer;

    layer = doc.layers.find(
      (l) => l.name.includes(layerName) || layerName.includes(l.name)
    );
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
          console.warn(
            `Skipping deletion of target layer ${layerName} (ID: ${adjustmentId})`
          );
          continue;
        }

        const adjLayer = doc.layers.find((l) => l.id === adjustmentId);
        if (adjLayer && adjLayer.kind === "adjustmentLayer") {
          console.log(
            `Deleting adjustment layer: ${adjLayer.name} (ID: ${adjustmentId})`
          );
          await adjLayer.delete();
        } else if (adjLayer) {
          console.warn(
            `Layer ${adjLayer.name} is not an adjustment layer, skipping deletion`
          );
        }
      } catch (e) {
        console.warn("Failed to remove adjustment layer:", e);
      }
    }

    // Enhanced cleanup: Remove any untracked adjustment layers and Smart Filters that might be affecting this layer
    try {
      // Get all adjustment layers in the document
      const allAdjustmentLayers = doc.layers.filter(layer => layer.kind === "adjustmentLayer");
      
      for (const adjLayer of allAdjustmentLayers) {
        // Skip if this is the target layer itself
        if (adjLayer.id === targetLayerId) {
          continue;
        }
        
        // Check if this adjustment layer is positioned above our target layer
        // and might be affecting it (this is a heuristic approach)
        const targetLayerIndex = doc.layers.indexOf(targetLayer);
        const adjLayerIndex = doc.layers.indexOf(adjLayer);
        
        // If adjustment layer is above target layer, it might be affecting it
        if (adjLayerIndex < targetLayerIndex) {
          console.log(
            `Removing untracked adjustment layer: ${adjLayer.name} (ID: ${adjLayer.id})`
          );
          try {
            await adjLayer.delete();
          } catch (e) {
            console.warn(`Failed to remove untracked adjustment layer ${adjLayer.name}:`, e);
          }
        }
      }

      // Also clear Smart Filters from the target layer specifically using filterFX
      if (targetLayer && (targetLayer.isSmartObject || targetLayer.kind === "smartObject")) {
        try {
          console.log(`Clearing Smart Filters from target layer: ${layerName} using filterFX`);
          
          // Select the target layer first
          doc.activeLayer = targetLayer;
          
          // Clear Smart Filters using filterFX delete command
          // Wrap in try-catch to suppress error dialogs but still attempt clearing
          try {
            await action.batchPlay([
              {
                _obj: "delete",
                _target: [
                  {
                    _ref: "filterFX"
                  }
                ],
                _options: {
                  dialogOptions: "dontDisplay"
                }
              }
            ], { synchronousExecution: false });
            
            console.log(`Cleared Smart Filters from layer: ${layerName}`);
          } catch (batchPlayError) {
            // Silently handle the "filter effects not available" error
            // This prevents the error dialog from showing
            if (batchPlayError.number === 9 || batchPlayError.number === 8007 || 
                batchPlayError.message.includes("not currently available")) {
              console.log(`Layer ${layerName} has no Smart Filters to clear`);
            } else {
              console.warn(`Failed to clear Smart Filters from layer ${layerName}:`, batchPlayError);
            }
          }
        } catch (e) {
          console.warn(`Failed to process layer ${layerName}:`, e);
        }
      }
    } catch (e) {
      console.warn("Error during enhanced cleanup:", e);
    }

    // Clear the tracking
    this.appliedAdjustments.delete(adjustmentKey);
  }

  /**
   * Clear all adjustment layers and smart filters for a fresh start
   */
  async clearAllAdjustmentLayers() {
    try {
      await core.executeAsModal(
        async () => {
          const doc = app.activeDocument;
          if (!doc) {
            console.warn("No active document found");
            return;
          }

          let totalCleared = 0;

          // Get all adjustment layers
          const adjustmentLayers = doc.layers.filter(layer => layer.kind === "adjustmentLayer");
          console.log(`Found ${adjustmentLayers.length} adjustment layers to remove`);
          
          // Remove all adjustment layers
          for (const adjLayer of adjustmentLayers) {
            try {
              console.log(`Removing adjustment layer: ${adjLayer.name}`);
              await adjLayer.delete();
              totalCleared++;
            } catch (e) {
              console.warn(`Failed to remove adjustment layer ${adjLayer.name}:`, e);
            }
          }

          // Clear Smart Filters from all layers
          for (const layer of doc.layers) {
            try {
              console.log(`Checking layer: ${layer.name}, type: ${layer.kind}`);
              
              // Try different ways to access Smart Filters
              let smartFilters = [];
              
              // Method 1: Direct smartFilters property
              if (layer.smartFilters) {
                console.log(`Layer ${layer.name} has smartFilters property:`, layer.smartFilters);
                smartFilters = layer.smartFilters;
              }
              
              // Method 2: Check if layer is a smart object
              if (layer.isSmartObject) {
                console.log(`Layer ${layer.name} is a smart object`);
                // Smart objects might have different filter access
                if (layer.smartFilters) {
                  smartFilters = layer.smartFilters;
                }
              }
              
              // Method 3: Check for adjustment layers that might be smart filters
              if (layer.kind === "adjustmentLayer") {
                console.log(`Layer ${layer.name} is an adjustment layer`);
                // Some adjustment layers might be smart filters
                if (layer.smartFilters) {
                  smartFilters = layer.smartFilters;
                }
              }
              
              // Method 4: Try to access filters through layer properties
              if (layer.filters) {
                console.log(`Layer ${layer.name} has filters property:`, layer.filters);
                smartFilters = layer.filters;
              }
              
              console.log(`Found ${smartFilters.length} Smart Filters on layer: ${layer.name}`);
              
              // Remove all Smart Filters from this layer
              for (const smartFilter of smartFilters) {
                try {
                  console.log(`Removing Smart Filter: ${smartFilter.name || 'unnamed'} from layer: ${layer.name}`);
                  await smartFilter.delete();
                  totalCleared++;
                } catch (e) {
                  console.warn(`Failed to remove Smart Filter ${smartFilter.name || 'unnamed'}:`, e);
                }
              }
            } catch (e) {
              console.warn(`Error checking Smart Filters on layer ${layer.name}:`, e);
            }
          }

          // Try alternative method: Use batchPlay to clear all Smart Filters
          try {
            console.log("Attempting to clear Smart Filters using batchPlay...");
            
            // Get all layers that might have Smart Filters
            const layersWithFilters = doc.layers.filter(layer => 
              layer.smartFilters || layer.filters || layer.isSmartObject
            );
            
            console.log(`Found ${layersWithFilters.length} layers that might have Smart Filters`);
            
            for (const layer of layersWithFilters) {
              // Try to clear Smart Filters using batchPlay
              await action.batchPlay([
                {
                  _obj: "clearLayerStyle",
                  _target: [
                    {
                      _ref: "layer",
                      _name: layer.name
                    }
                  ],
                  _options: { dialogOptions: "dontDisplay" }
                }
              ], { synchronousExecution: false });
              
              console.log(`Cleared layer style for: ${layer.name}`);
              totalCleared++;
            }
          } catch (e) {
            console.warn("batchPlay clearLayerStyle failed:", e);
          }

          // Clear Smart Filters using the correct filterFX approach
          try {
            console.log("Attempting to clear Smart Filters using filterFX delete command...");
            
            // Get all layers that might be Smart Objects
            const smartObjectLayers = doc.layers.filter(layer => 
              layer.isSmartObject || layer.kind === "smartObject"
            );
            
            console.log(`Found ${smartObjectLayers.length} Smart Object layers`);
            
            for (const layer of smartObjectLayers) {
              try {
                // Select the layer first
                doc.activeLayer = layer;
                console.log(`Selected layer: ${layer.name}`);
                
                // Clear Smart Filters using filterFX delete command
                // Wrap in try-catch to suppress error dialogs but still attempt clearing
                try {
                  await action.batchPlay([
                    {
                      _obj: "delete",
                      _target: [
                        {
                          _ref: "filterFX"
                        }
                      ],
                      _options: {
                        dialogOptions: "dontDisplay"
                      }
                    }
                  ], { synchronousExecution: false });
                  
                  console.log(`Cleared Smart Filters from layer: ${layer.name}`);
                  totalCleared++;
                } catch (batchPlayError) {
                  // Silently handle the "filter effects not available" error
                  // This prevents the error dialog from showing
                  if (batchPlayError.number === 9 || batchPlayError.number === 8007 || 
                      batchPlayError.message.includes("not currently available")) {
                    console.log(`Layer ${layer.name} has no Smart Filters to clear`);
                  } else {
                    console.warn(`Failed to clear Smart Filters from layer ${layer.name}:`, batchPlayError);
                  }
                }
              } catch (e) {
                console.warn(`Failed to process layer ${layer.name}:`, e);
              }
            }
          } catch (e) {
            console.warn("filterFX delete command failed:", e);
          }

          // Clear all tracking
          this.appliedAdjustments.clear();
          
          this.emit("log", {
            message: `🧹 Cleared ${totalCleared} adjustment layers and Smart Filters`,
            type: "info",
          });
        },
        { commandName: "Clear All Adjustment Layers and Smart Filters" }
      );
    } catch (e) {
      console.error("Error clearing adjustment layers:", e);
      this.emit("log", {
        message: `Error clearing layers: ${e.message}`,
        type: "error",
      });
    }
  }

  /**
   * Apply CSS operations to Photoshop
   */
  async applyCSSOperations(cssText) {
    console.log("Parsing CSS text:", cssText);
    
    // Clear all previous adjustment layers for a fresh start
    await this.clearAllAdjustmentLayers();
    
    const operations = this.parseCSSToOperations(cssText);
    if (!operations.length) {
      this.emit("log", {
        message: "No valid operations found",
        type: "warning",
      });
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
          operations.forEach((op) => {
            if (!operationsByLayer[op.layerName]) {
              operationsByLayer[op.layerName] = [];
            }
            operationsByLayer[op.layerName].push(op);
          });

          for (const [layerName, layerOps] of Object.entries(
            operationsByLayer
          )) {
            try {
              // Find the target layer
              let targetLayer = this.findLayerByName(doc, layerName);

              if (!targetLayer) {
                targetLayer = await doc.createLayer({ name: layerName });
                this.emit("log", {
                  message: `Created new layer: ${layerName}`,
                  type: "info",
                });
              }

              await this.resetLayerAdjustments(doc, layerName);

              // Track applied adjustment layer IDs for this layer
              const appliedIds = [];
              const adjustmentKey = `${doc.id}_${layerName}`;

              // Process each operation for this layer
              for (const op of layerOps) {
                try {
                  switch (op.type) {
                    case "opacity":
                      targetLayer.opacity = op.value;
                      this.emit("log", {
                        message: `✓ Applied opacity to ${layerName}`,
                        type: "success",
                      });
                      successfulOperations++;
                      break;

                    case "blendingMode":
                      targetLayer.blendMode = op.mode;
                      this.emit("log", {
                        message: `✓ Applied blending mode to ${layerName}`,
                        type: "success",
                      });
                      successfulOperations++;
                      break;

                    case "fillOpacity":
                      targetLayer.fillOpacity = op.value;
                      this.emit("log", {
                        message: `✓ Applied fill opacity to ${layerName}`,
                        type: "success",
                      });
                      successfulOperations++;
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
                              },
                            ],
                          },
                        ],
                        { synchronousExecution: false }
                      );

                      const hueAdjLayer = doc.layers.find(
                        (layer) =>
                          layer.kind === "adjustmentLayer" &&
                          layer.name.includes("Hue/Saturation")
                      );
                      if (hueAdjLayer) {
                        appliedIds.push(hueAdjLayer.id);

                        // Move adjustment layer directly above target layer
                        await hueAdjLayer.move(targetLayer, "placeBefore");

                        // Set as active and clip to layer below
                        doc.activeLayer = hueAdjLayer;
                        await action.batchPlay(
                          [
                            {
                              _obj: "groupEvent",
                              _target: [
                                {
                                  _ref: "layer",
                                  _enum: "ordinal",
                                  _value: "targetEnum",
                                },
                              ],
                              _options: { dialogOptions: "dontDisplay" },
                            },
                          ],
                          { synchronousExecution: false }
                        );

                        this.emit("log", {
                          message: `✓ Applied hue/saturation adjustment to ${layerName}`,
                          type: "success",
                        });
                        successfulOperations++;
                        break;
                      }

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

                      const bcAdjLayer = doc.layers.find(
                        (layer) =>
                          layer.kind === "adjustmentLayer" &&
                          layer.name.includes("Brightness/Contrast")
                      );

                      if (bcAdjLayer) {
                        appliedIds.push(bcAdjLayer.id);
                        await bcAdjLayer.move(targetLayer, "placeBefore");

                        this.emit("log", {
                          message: `✓ Applied brightness/contrast to ${layerName}`,
                          type: "success",
                        });
                        successfulOperations++;
                      } else {
                        console.warn(
                          "Could not find created Brightness/Contrast adjustment layer"
                        );
                      }
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

                      const vibAdjLayer = doc.activeLayer;
                      appliedIds.push(vibAdjLayer.id);
                      await vibAdjLayer.move(targetLayer, "placeBefore");

                      this.emit("log", {
                        message: `✓ Applied vibrance to ${layerName}`,
                        type: "success",
                      });
                      successfulOperations++;
                      break;

                    case "gaussianBlur":
                      await action.batchPlay(
                        [
                          {
                            _obj: "gaussianBlur",
                            radius: op.radius,
                            _options: { dialogOptions: "dontDisplay" },
                          },
                        ],
                        { synchronousExecution: false }
                      );

                      this.emit("log", {
                        message: `✓ Applied gaussian blur to ${layerName}`,
                        type: "success",
                      });
                      successfulOperations++;
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

                      this.emit("log", {
                        message: `✓ Applied noise to ${layerName}`,
                        type: "success",
                      });
                      successfulOperations++;
                      break;

                    default:
                      console.warn("Unsupported operation", op);
                  }
                } catch (opError) {
                  console.error(
                    `Error applying operation ${op.type} to ${layerName}:`,
                    opError
                  );
                  errors.push(
                    `Operation ${op.type} failed: ${opError.message}`
                  );
                }
              }

              // Store the applied adjustment IDs for this layer
              if (appliedIds.length > 0) {
                this.appliedAdjustments.set(adjustmentKey, appliedIds);
              }
            } catch (layerError) {
              console.error(`Error processing layer ${layerName}:`, layerError);
              errors.push(`Layer ${layerName} failed: ${layerError.message}`);
            }
          }
        },
        { commandName: "Apply CSS Operations" }
      );
    } catch (e) {
      if (e.number === 9) {
        this.emit("log", {
          message: "Modal conflict - another modal is active",
          type: "error",
        });
      } else {
        this.emit("log", {
          message: `Photoshop error: ${e.message}`,
          type: "error",
        });
      }
      errors.push(e.message);
    }

    // Summary message
    if (errors.length > 0) {
      this.emit("log", {
        message: `Completed with ${successfulOperations} successful operations, ${errors.length} errors`,
        type: "warning",
      });
    } else {
      this.emit("log", {
        message: `✅ Successfully applied ${successfulOperations} operations`,
        type: "success",
      });
    }

    return {
      success: errors.length === 0,
      operationsCount: successfulOperations,
      errors: errors,
    };
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
}

// Export singleton instance
const photoshopController = new PhotoshopController();
export default photoshopController;
