/**
 * CSS Parser for Photoshop Adjustments
 * Converts CSS-like syntax to Photoshop commands
 */

export class CSSParser {
    constructor() {
        this.supportedProperties = {
            'contrast': this.applyContrast,
            'saturation': this.applySaturation,
            'brightness': this.applyBrightness,
            'hue': this.applyHue,
            'blur': this.applyBlur,
            'opacity': this.applyOpacity,
            'levels': this.applyLevels,
            'curves': this.applyCurves,
            'vibrance': this.applyVibrance,
            'shadows': this.applyShadows,
            'highlights': this.applyHighlights
        };
    }

    /**
     * Parse CSS-like code and return Photoshop commands
     */
    parse(cssCode) {
        const commands = [];
        const lines = cssCode.split('\n');
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('/*') || trimmedLine.startsWith('//')) {
                continue;
            }

            // Parse property: value;
            const match = trimmedLine.match(/([a-zA-Z-]+)\s*:\s*([^;]+);?/);
            if (match) {
                const [, property, value] = match;
                const cleanProperty = property.trim();
                const cleanValue = value.trim();
                
                if (this.supportedProperties[cleanProperty]) {
                    const command = this.supportedProperties[cleanProperty](cleanValue);
                    if (command) {
                        commands.push(command);
                    }
                }
            }
        }
        
        return commands;
    }

    /**
     * Apply contrast adjustment
     */
    applyContrast(value) {
        const contrastValue = this.parsePercentage(value);
        if (contrastValue === null) return null;
        
        return {
            type: 'adjustment',
            name: 'Brightness/Contrast',
            params: {
                contrast: contrastValue
            }
        };
    }

    /**
     * Apply saturation adjustment
     */
    applySaturation(value) {
        const saturationValue = this.parsePercentage(value);
        if (saturationValue === null) return null;
        
        return {
            type: 'adjustment',
            name: 'Hue/Saturation',
            params: {
                saturation: saturationValue
            }
        };
    }

    /**
     * Apply brightness adjustment
     */
    applyBrightness(value) {
        const brightnessValue = this.parsePercentage(value);
        if (brightnessValue === null) return null;
        
        return {
            type: 'adjustment',
            name: 'Brightness/Contrast',
            params: {
                brightness: brightnessValue
            }
        };
    }

    /**
     * Apply hue adjustment
     */
    applyHue(value) {
        const hueValue = this.parseAngle(value);
        if (hueValue === null) return null;
        
        return {
            type: 'adjustment',
            name: 'Hue/Saturation',
            params: {
                hue: hueValue
            }
        };
    }

    /**
     * Apply blur filter
     */
    applyBlur(value) {
        const blurValue = this.parsePixel(value);
        if (blurValue === null) return null;
        
        return {
            type: 'filter',
            name: 'Gaussian Blur',
            params: {
                radius: blurValue
            }
        };
    }

    /**
     * Apply opacity adjustment
     */
    applyOpacity(value) {
        const opacityValue = this.parsePercentage(value);
        if (opacityValue === null) return null;
        
        return {
            type: 'layer',
            name: 'opacity',
            params: {
                opacity: opacityValue
            }
        };
    }

    /**
     * Apply levels adjustment
     */
    applyLevels(value) {
        // Parse levels like: "0, 1.2, 255" or "shadows: 0, midtones: 1.2, highlights: 255"
        const levelsMatch = value.match(/(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/);
        if (levelsMatch) {
            const [, shadows, midtones, highlights] = levelsMatch;
            return {
                type: 'adjustment',
                name: 'Levels',
                params: {
                    shadows: parseFloat(shadows),
                    midtones: parseFloat(midtones),
                    highlights: parseFloat(highlights)
                }
            };
        }
        return null;
    }

    /**
     * Apply curves adjustment
     */
    applyCurves(value) {
        // Parse curves like: "0,0 255,255" or "linear"
        if (value.toLowerCase() === 'linear') {
            return {
                type: 'adjustment',
                name: 'Curves',
                params: {
                    curve: 'linear'
                }
            };
        }
        return null;
    }

    /**
     * Apply vibrance adjustment
     */
    applyVibrance(value) {
        const vibranceValue = this.parsePercentage(value);
        if (vibranceValue === null) return null;
        
        return {
            type: 'adjustment',
            name: 'Vibrance',
            params: {
                vibrance: vibranceValue
            }
        };
    }

    /**
     * Apply shadows adjustment
     */
    applyShadows(value) {
        const shadowsValue = this.parsePercentage(value);
        if (shadowsValue === null) return null;
        
        return {
            type: 'adjustment',
            name: 'Shadows/Highlights',
            params: {
                shadows: shadowsValue
            }
        };
    }

    /**
     * Apply highlights adjustment
     */
    applyHighlights(value) {
        const highlightsValue = this.parsePercentage(value);
        if (highlightsValue === null) return null;
        
        return {
            type: 'adjustment',
            name: 'Shadows/Highlights',
            params: {
                highlights: highlightsValue
            }
        };
    }

    /**
     * Parse percentage values (e.g., "120%", "-20%")
     */
    parsePercentage(value) {
        const match = value.match(/(-?\d+(?:\.\d+)?)%/);
        if (match) {
            return parseFloat(match[1]);
        }
        return null;
    }

    /**
     * Parse angle values (e.g., "15deg", "-30deg")
     */
    parseAngle(value) {
        const match = value.match(/(-?\d+(?:\.\d+)?)deg/);
        if (match) {
            return parseFloat(match[1]);
        }
        return null;
    }

    /**
     * Parse pixel values (e.g., "2px", "0.5px")
     */
    parsePixel(value) {
        const match = value.match(/(\d+(?:\.\d+)?)px/);
        if (match) {
            return parseFloat(match[1]);
        }
        return null;
    }

    /**
     * Get list of supported properties
     */
    getSupportedProperties() {
        return Object.keys(this.supportedProperties);
    }
} 