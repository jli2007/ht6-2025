// controllers/PhotoshopController.js

/**
 * Controller for handling CSS-to-Photoshop operations
 * Manages communication between React UI and ExtendScript
 */
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
        if (typeof window !== 'undefined' && window.postMessage) {
            window.addEventListener('message', (event) => {
                this.handleExtendScriptMessage(event.data);
            });
        }
    }

    /**
     * Check if Photoshop is available and has an open document
     */
    async checkPhotoshopConnection() {
        try {
            if (typeof app !== 'undefined' && app.documents.length > 0) {
                this.isConnected = true;
                this.emit('connectionChanged', { connected: true });
                return true;
            }
        } catch (error) {
            console.warn('Photoshop connection check failed:', error);
        }
        
        this.isConnected = false;
        this.emit('connectionChanged', { connected: false });
        return false;
    }

    /**
     * Parse CSS string into layer operations
     */
    parseCSSToOperations(cssText) {
        const operations = [];
        const rules = this.extractCSSRules(cssText);
        
        rules.forEach(rule => {
            const { selector, properties } = rule;
            const layerName = selector.replace('#', '').trim();
            
            // Convert each CSS property to Photoshop operation
            Object.entries(properties).forEach(([property, value]) => {
                const operation = this.convertCSSPropertyToOperation(layerName, property, value);
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
        
        ruleMatches.forEach(ruleText => {
            const [selectorPart, propertiesPart] = ruleText.split('{');
            const selector = selectorPart.trim();
            const propertiesText = propertiesPart.replace('}', '').trim();
            
            const properties = {};
            propertiesText.split(';').forEach(propertyText => {
                const [prop, val] = propertyText.split(':').map(s => s.trim());
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
        const operationMap = {
            'blur': () => ({
                type: 'gaussianBlur',
                layerName,
                radius: Math.max(0, value)
            }),
            'opacity': () => ({
                type: 'opacity',
                layerName,
                value: Math.max(0, Math.min(100, value))
            }),
            'hue': () => ({
                type: 'hueAdjustment',
                layerName,
                hue: value
            }),
            'brightness': () => ({
                type: 'brightnessContrast',
                layerName,
                brightness: value
            }),
            'contrast': () => ({
                type: 'brightnessContrast',
                layerName,
                contrast: value
            }),
            'saturation': () => ({
                type: 'saturationAdjustment',
                layerName,
                saturation: value
            })
        };

        const operationFactory = operationMap[property.toLowerCase()];
        return operationFactory ? operationFactory() : null;
    }

    /**
     * Apply CSS operations to Photoshop
     */
    async applyCSSOperations(cssText) {
        try {
            // Check connection first
            if (!await this.checkPhotoshopConnection()) {
                throw new Error('No Photoshop document is open');
            }

            // Parse CSS to operations
            const operations = this.parseCSSToOperations(cssText);
            
            if (operations.length === 0) {
                throw new Error('No valid CSS operations found');
            }

            // Execute operations via ExtendScript
            const result = await this.executeExtendScript(operations);
            
            this.emit('operationsApplied', { operations, result });
            return result;

        } catch (error) {
            this.emit('error', { error: error.message });
            throw error;
        }
    }

    /**
     * Execute ExtendScript operations
     */
    async executeExtendScript(operations) {
        return new Promise((resolve, reject) => {
            try {
                // Generate and execute ExtendScript
                const script = this.generateExtendScript(operations);
                
                // In UXP environment, execute the script
                if (typeof app !== 'undefined') {
                    app.doScript(script);
                    resolve({ success: true, operationsCount: operations.length });
                } else {
                    // For development/testing
                    console.log('ExtendScript to execute:', script);
                    setTimeout(() => resolve({ success: true, operationsCount: operations.length }), 500);
                }
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Generate ExtendScript from operations
     */
    generateExtendScript(operations) {
        let script = `
// Auto-generated ExtendScript for CSS operations
#target photoshop

try {
    if (!app.documents.length) {
        throw new Error("No document is open");
    }
    
    var doc = app.activeDocument;
    var originalRulerUnits = app.preferences.rulerUnits;
    app.preferences.rulerUnits = Units.PIXELS;
    
`;

        // Group operations by layer
        const layerOperations = this.groupOperationsByLayer(operations);
        
        Object.entries(layerOperations).forEach(([layerName, ops]) => {
            script += this.generateLayerScript(layerName, ops);
        });

        script += `
    app.preferences.rulerUnits = originalRulerUnits;
    
} catch (error) {
    alert("CSS to Photoshop Error: " + error.message);
}
`;

        return script;
    }

    /**
     * Group operations by layer
     */
    groupOperationsByLayer(operations) {
        const grouped = {};
        operations.forEach(op => {
            if (!grouped[op.layerName]) {
                grouped[op.layerName] = [];
            }
            grouped[op.layerName].push(op);
        });
        return grouped;
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

        operations.forEach(op => {
            script += this.generateOperationScript(op);
        });

        return script;
    }

    /**
     * Generate ExtendScript for individual operation
     */
    generateOperationScript(operation) {
        switch (operation.type) {
            case 'gaussianBlur':
                return `    doc.activeLayer.applyGaussianBlur(${operation.radius});\n`;
                
            case 'opacity':
                return `    doc.activeLayer.opacity = ${operation.value};\n`;
                
            case 'hueAdjustment':
                return `
    var hueLayer = doc.adjustmentLayers.add(AdjustmentReference.HUESATURATION);
    hueLayer.adjustmentLayer.hue = ${operation.hue};
    hueLayer.grouped = true;
`;
                
            case 'brightnessContrast':
                return `
    var bcLayer = doc.adjustmentLayers.add(AdjustmentReference.BRIGHTNESSCONTRAST);
    ${operation.brightness ? `bcLayer.adjustmentLayer.brightness = ${operation.brightness - 100};` : ''}
    ${operation.contrast ? `bcLayer.adjustmentLayer.contrast = ${operation.contrast - 100};` : ''}
    bcLayer.grouped = true;
`;
                
            default:
                return `    // Unknown operation: ${operation.type}\n`;
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
            this.eventListeners.get(event).forEach(callback => {
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
            hasDocument: this.isConnected && app.documents.length > 0
        };
    }
}

// Export singleton instance
const photoshopController = new PhotoshopController();
export default photoshopController;