/**
 * Photoshop Executor
 * Applies CSS-like commands to Photoshop layers
 */

export class PhotoshopExecutor {
    constructor() {
        this.app = require('photoshop').app;
    }

    /**
     * Execute a list of commands on the current layer
     */
    async executeCommands(commands) {
        try {
            // Get the active document and layer
            const doc = this.app.activeDocument;
            if (!doc) {
                throw new Error("No active document found");
            }

            const layer = doc.activeLayer;
            if (!layer) {
                throw new Error("No active layer found");
            }

            console.log(`Applying ${commands.length} commands to layer: ${layer.name}`);

            // Execute each command
            for (const command of commands) {
                await this.executeCommand(command, doc, layer);
            }

            console.log("All commands executed successfully");
            return true;

        } catch (error) {
            console.error("Error executing commands:", error);
            throw error;
        }
    }

    /**
     * Execute a single command
     */
    async executeCommand(command, doc, layer) {
        console.log(`Executing: ${command.type} - ${command.name}`, command.params);

        switch (command.type) {
            case 'adjustment':
                await this.applyAdjustment(command, doc, layer);
                break;
            case 'filter':
                await this.applyFilter(command, doc, layer);
                break;
            case 'layer':
                await this.applyLayerProperty(command, doc, layer);
                break;
            default:
                console.warn(`Unknown command type: ${command.type}`);
        }
    }

    /**
     * Apply adjustment layer
     */
    async applyAdjustment(command, doc, layer) {
        const { name, params } = command;

        switch (name) {
            case 'Brightness/Contrast':
                await this.applyBrightnessContrast(params, doc, layer);
                break;
            case 'Hue/Saturation':
                await this.applyHueSaturation(params, doc, layer);
                break;
            case 'Levels':
                await this.applyLevels(params, doc, layer);
                break;
            case 'Curves':
                await this.applyCurves(params, doc, layer);
                break;
            case 'Vibrance':
                await this.applyVibrance(params, doc, layer);
                break;
            case 'Shadows/Highlights':
                await this.applyShadowsHighlights(params, doc, layer);
                break;
            default:
                console.warn(`Unknown adjustment: ${name}`);
        }
    }

    /**
     * Apply brightness/contrast adjustment
     */
    async applyBrightnessContrast(params, doc, layer) {
        const adjustmentLayer = doc.artLayers.add();
        adjustmentLayer.name = "Brightness/Contrast";
        adjustmentLayer.kind = "brightnessEvent";

        if (params.brightness !== undefined) {
            adjustmentLayer.adjustBrightness = params.brightness;
        }
        if (params.contrast !== undefined) {
            adjustmentLayer.adjustContrast = params.contrast;
        }
    }

    /**
     * Apply hue/saturation adjustment
     */
    async applyHueSaturation(params, doc, layer) {
        const adjustmentLayer = doc.artLayers.add();
        adjustmentLayer.name = "Hue/Saturation";
        adjustmentLayer.kind = "hueSaturationEvent";

        if (params.saturation !== undefined) {
            adjustmentLayer.adjustSaturation = params.saturation;
        }
        if (params.hue !== undefined) {
            adjustmentLayer.adjustHue = params.hue;
        }
    }

    /**
     * Apply levels adjustment
     */
    async applyLevels(params, doc, layer) {
        const adjustmentLayer = doc.artLayers.add();
        adjustmentLayer.name = "Levels";
        adjustmentLayer.kind = "levelsEvent";

        if (params.shadows !== undefined) {
            adjustmentLayer.adjustShadows = params.shadows;
        }
        if (params.midtones !== undefined) {
            adjustmentLayer.adjustMidtones = params.midtones;
        }
        if (params.highlights !== undefined) {
            adjustmentLayer.adjustHighlights = params.highlights;
        }
    }

    /**
     * Apply curves adjustment
     */
    async applyCurves(params, doc, layer) {
        const adjustmentLayer = doc.artLayers.add();
        adjustmentLayer.name = "Curves";
        adjustmentLayer.kind = "curvesEvent";

        if (params.curve === 'linear') {
            // Apply linear curve (default)
            adjustmentLayer.adjustCurve = "linear";
        }
    }

    /**
     * Apply vibrance adjustment
     */
    async applyVibrance(params, doc, layer) {
        const adjustmentLayer = doc.artLayers.add();
        adjustmentLayer.name = "Vibrance";
        adjustmentLayer.kind = "vibranceEvent";

        if (params.vibrance !== undefined) {
            adjustmentLayer.adjustVibrance = params.vibrance;
        }
    }

    /**
     * Apply shadows/highlights adjustment
     */
    async applyShadowsHighlights(params, doc, layer) {
        const adjustmentLayer = doc.artLayers.add();
        adjustmentLayer.name = "Shadows/Highlights";
        adjustmentLayer.kind = "shadowsHighlightsEvent";

        if (params.shadows !== undefined) {
            adjustmentLayer.adjustShadows = params.shadows;
        }
        if (params.highlights !== undefined) {
            adjustmentLayer.adjustHighlights = params.highlights;
        }
    }

    /**
     * Apply filter
     */
    async applyFilter(command, doc, layer) {
        const { name, params } = command;

        switch (name) {
            case 'Gaussian Blur':
                await this.applyGaussianBlur(params, doc, layer);
                break;
            default:
                console.warn(`Unknown filter: ${name}`);
        }
    }

    /**
     * Apply Gaussian blur filter
     */
    async applyGaussianBlur(params, doc, layer) {
        // Select the layer first
        layer.selected = true;

        // Apply Gaussian blur
        const blurAction = require('photoshop').core.executeAsModal;
        await blurAction(() => {
            const blurFilter = require('photoshop').core.executeAsModal;
            blurFilter(() => {
                const filter = require('photoshop').core.executeAsModal;
                filter(() => {
                    const gaussianBlur = require('photoshop').core.executeAsModal;
                    gaussianBlur(() => {
                        const blur = require('photoshop').core.executeAsModal;
                        blur(() => {
                            const gaussian = require('photoshop').core.executeAsModal;
                            gaussian(() => {
                                const radius = params.radius || 1;
                                // This is a simplified version - actual implementation would use Photoshop's API
                                console.log(`Applying Gaussian Blur with radius: ${radius}`);
                            });
                        });
                    });
                });
            });
        });
    }

    /**
     * Apply layer property
     */
    async applyLayerProperty(command, doc, layer) {
        const { name, params } = command;

        switch (name) {
            case 'opacity':
                if (params.opacity !== undefined) {
                    layer.opacity = Math.max(0, Math.min(100, params.opacity));
                }
                break;
            default:
                console.warn(`Unknown layer property: ${name}`);
        }
    }

    /**
     * Get current document info
     */
    getDocumentInfo() {
        const doc = this.app.activeDocument;
        if (!doc) {
            return null;
        }

        return {
            name: doc.name,
            width: doc.width,
            height: doc.height,
            activeLayer: doc.activeLayer ? doc.activeLayer.name : null
        };
    }

    /**
     * Check if we have an active document and layer
     */
    hasActiveLayer() {
        const doc = this.app.activeDocument;
        return doc && doc.activeLayer;
    }
} 