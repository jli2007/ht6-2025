import React, { useState, useEffect } from "react";
import { WC } from "./WC.jsx";
import "./Settings.css";

export const Settings = ({ onClose }) => {
    const [apiKey, setApiKey] = useState("");
    const [isValidating, setIsValidating] = useState(false);
    const [validationMessage, setValidationMessage] = useState("");
    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        // Load saved API key from localStorage
        const savedApiKey = localStorage.getItem('gemini_api_key');
        if (savedApiKey) {
            setApiKey(savedApiKey);
            setIsValid(true);
        }
    }, []);

    const handleSave = () => {
        if (apiKey.trim()) {
            localStorage.setItem('gemini_api_key', apiKey.trim());
            setIsValid(true);
            setValidationMessage("API key saved successfully!");
            setTimeout(() => setValidationMessage(""), 3000);
        }
    };

    const handleTest = async () => {
        if (!apiKey.trim()) {
            setValidationMessage("Please enter an API key first");
            return;
        }

        setIsValidating(true);
        setValidationMessage("Testing API connection...");

        try {
            // Import GeminiService dynamically to avoid issues
            const { GeminiService } = await import('../services/GeminiService.js');
            const geminiService = new GeminiService(apiKey.trim());
            
            const isValid = await geminiService.testConnection();
            
            if (isValid) {
                setValidationMessage("API connection successful!");
                setIsValid(true);
            } else {
                setValidationMessage("API connection failed. Please check your key.");
                setIsValid(false);
            }
        } catch (error) {
            setValidationMessage(`Error: ${error.message}`);
            setIsValid(false);
        } finally {
            setIsValidating(false);
            setTimeout(() => setValidationMessage(""), 5000);
        }
    };

    const handleClear = () => {
        setApiKey("");
        setIsValid(false);
        localStorage.removeItem('gemini_api_key');
        setValidationMessage("API key cleared");
        setTimeout(() => setValidationMessage(""), 3000);
    };

    return (
        <div className="settings-modal">
            <div className="settings-content">
                <div className="settings-header">
                    <h2>Plugin Settings</h2>
                    <sp-button 
                        variant="secondary" 
                        size="s"
                        onClick={onClose}
                    >
                        ✕
                    </sp-button>
                </div>

                <div className="settings-body">
                    <div className="setting-group">
                        <h3>Gemini API Configuration</h3>
                        <p className="setting-description">
                            Enter your Gemini API key to enable AI-powered CSS generation. 
                            Get your key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>.
                        </p>
                        <p className="setting-description">
                            <strong>Alternative:</strong> You can also set your API key in a <code>.env</code> file in the project root with <code>GEMINI_API_KEY=your_key_here</code>
                        </p>
                        
                        <div className="api-key-input">
                            <sp-textfield
                                type="password"
                                placeholder="Enter your Gemini API key"
                                value={apiKey}
                                onInput={(e) => setApiKey(e.target.value)}
                                size="m"
                                className={isValid ? "valid" : ""}
                            />
                            <div className="api-key-actions">
                                <sp-button 
                                    variant="cta" 
                                    size="s"
                                    onClick={handleSave}
                                    disabled={!apiKey.trim()}
                                >
                                    Save
                                </sp-button>
                                <sp-button 
                                    variant="secondary" 
                                    size="s"
                                    onClick={handleTest}
                                    disabled={!apiKey.trim() || isValidating}
                                >
                                    {isValidating ? "Testing..." : "Test"}
                                </sp-button>
                                <sp-button 
                                    variant="secondary" 
                                    size="s"
                                    onClick={handleClear}
                                >
                                    Clear
                                </sp-button>
                            </div>
                        </div>

                        {validationMessage && (
                            <div className={`validation-message ${isValid ? 'success' : 'error'}`}>
                                {validationMessage}
                            </div>
                        )}
                    </div>

                    <div className="setting-group">
                        <h3>How to Get Your API Key</h3>
                        <ol className="setup-steps">
                            <li>Go to <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></li>
                            <li>Sign in with your Google account</li>
                            <li>Click "Create API Key"</li>
                            <li>Copy the generated key and paste it above</li>
                            <li>Click "Test" to verify the connection</li>
                        </ol>
                    </div>

                    <div className="setting-group">
                        <h3>Features</h3>
                        <ul className="features-list">
                            <li>✅ AI-powered CSS generation from text descriptions</li>
                            <li>✅ CSS-like syntax for Photoshop adjustments</li>
                            <li>✅ Real-time preview and editing</li>
                            <li>✅ Apply adjustments to active layers</li>
                            <li>✅ Support for multiple adjustment types</li>
                        </ul>
                    </div>
                </div>

                <div className="settings-footer">
                    <sp-button 
                        variant="cta" 
                        onClick={onClose}
                    >
                        Done
                    </sp-button>
                </div>
            </div>
        </div>
    );
}; 