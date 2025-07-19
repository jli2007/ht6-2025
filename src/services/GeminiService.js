/**
 * Gemini Service for generating CSS-like Photoshop adjustments
 */

export class GeminiService {
    constructor(apiKey = null) {
        // Use provided API key or fall back to environment variable
        this.apiKey = apiKey || process.env.GEMINI_API_KEY;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        
        if (!this.apiKey) {
            throw new Error('Gemini API key not found. Please set GEMINI_API_KEY in your .env file or provide it as a parameter.');
        }
    }

    /**
     * Generate CSS-like code from a text description
     */
    async generateCSS(prompt) {
        try {
            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: this.buildPrompt(prompt)
                        }]
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const generatedText = data.candidates[0].content.parts[0].text;
                return this.extractCSSFromResponse(generatedText);
            } else {
                throw new Error('No valid response from Gemini API');
            }

        } catch (error) {
            console.error('Error generating CSS:', error);
            throw error;
        }
    }

    /**
     * Build the prompt for Gemini
     */
    buildPrompt(userPrompt) {
        return `You are an expert Photoshop adjustment generator. Convert the following description into CSS-like code that can be applied to Photoshop layers.

User request: "${userPrompt}"

Generate CSS-like code using these supported properties:
- contrast: percentage (e.g., 120%, -20%)
- saturation: percentage (e.g., 150%, -50%)
- brightness: percentage (e.g., 105%, -10%)
- hue: degrees (e.g., 15deg, -30deg)
- blur: pixels (e.g., 2px, 0.5px)
- opacity: percentage (e.g., 85%, 100%)
- levels: "shadows, midtones, highlights" (e.g., "0, 1.2, 255")
- vibrance: percentage (e.g., 25%, -15%)
- shadows: percentage (e.g., 20%, -10%)
- highlights: percentage (e.g., -15%, 25%)

Rules:
1. Use realistic values that would create the described effect
2. Include comments explaining your choices
3. Return ONLY the CSS-like code, no other text
4. Use the .layer selector
5. Keep it concise but effective

Example output format:
/* CSS-like Photoshop adjustments */
.layer {
    contrast: 120%;
    saturation: -20%;
    brightness: 105%;
    hue: 15deg;
    blur: 2px;
    opacity: 85%;
}

Now generate CSS for: "${userPrompt}"`;
    }

    /**
     * Extract CSS code from Gemini's response
     */
    extractCSSFromResponse(response) {
        // Look for CSS-like code blocks
        const cssMatch = response.match(/```(?:css)?\s*([\s\S]*?)\s*```/);
        if (cssMatch) {
            return cssMatch[1].trim();
        }

        // Look for CSS-like code without code blocks
        const cssPattern = /\.layer\s*\{[\s\S]*?\}/;
        const match = response.match(cssPattern);
        if (match) {
            return match[0];
        }

        // If no CSS found, return a basic template
        return `/* Generated CSS for: ${response} */
.layer {
    contrast: 100%;
    saturation: 0%;
    brightness: 100%;
}`;
    }

    /**
     * Generate CSS from an image (using Gemini Vision API)
     */
    async generateCSSFromImage(imageData, description = "") {
        try {
            // Convert image data to base64 if it's a data URL
            let base64Data;
            if (imageData.startsWith('data:')) {
                base64Data = imageData.split(',')[1];
            } else {
                base64Data = await this.imageToBase64(imageData);
            }

            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                text: this.buildImagePrompt(description)
                            },
                            {
                                inline_data: {
                                    mime_type: "image/jpeg",
                                    data: base64Data
                                }
                            }
                        ]
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const generatedText = data.candidates[0].content.parts[0].text;
                return this.extractCSSFromResponse(generatedText);
            } else {
                throw new Error('No valid response from Gemini API');
            }

        } catch (error) {
            console.error('Error generating CSS from image:', error);
            throw error;
        }
    }

    /**
     * Analyze current layer and generate CSS to match its style
     */
    async analyzeCurrentLayer() {
        try {
            // This would integrate with Photoshop API to get current layer properties
            // For now, we'll return a template that the user can modify
            return `/* Analyze current layer and generate matching CSS */
.layer {
    /* Generated based on current layer analysis */
    contrast: 100%;
    saturation: 0%;
    brightness: 100%;
    /* Add more properties based on layer analysis */
}`;
        } catch (error) {
            console.error('Error analyzing current layer:', error);
            throw error;
        }
    }

    /**
     * Build prompt for image-based generation
     */
    buildImagePrompt(description) {
        return `You are an expert Photoshop adjustment generator. Analyze this image and generate CSS-like code that would recreate its visual style.

${description ? `Additional context: "${description}"` : ''}

Generate CSS-like code using these supported properties:
- contrast: percentage (e.g., 120%, -20%)
- saturation: percentage (e.g., 150%, -50%)
- brightness: percentage (e.g., 105%, -10%)
- hue: degrees (e.g., 15deg, -30deg)
- blur: pixels (e.g., 2px, 0.5px)
- opacity: percentage (e.g., 85%, 100%)
- levels: "shadows, midtones, highlights" (e.g., "0, 1.2, 255")
- vibrance: percentage (e.g., 25%, -15%)
- shadows: percentage (e.g., 20%, -10%)
- highlights: percentage (e.g., -15%, 25%)

Analyze the image's:
- Color temperature and hue
- Contrast and brightness
- Saturation and vibrance
- Overall mood and style

Return ONLY the CSS-like code, no other text. Use the .layer selector.`;
    }

    /**
     * Convert image URL to base64 (for API calls)
     */
    async imageToBase64(imageUrl) {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error converting image to base64:', error);
            throw error;
        }
    }

    /**
     * Test the API connection
     */
    async testConnection() {
        try {
            const response = await this.generateCSS("test connection");
            return response.length > 0;
        } catch (error) {
            console.error('API connection test failed:', error);
            return false;
        }
    }
} 