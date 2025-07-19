import React, { useState, useRef } from "react";
import { WC } from "./WC.jsx";
import "./CSSEditor.css";

export const CSSEditor = ({ onApply, onGenerate, initialCSS }) => {
    const [cssCode, setCssCode] = useState(initialCSS || `/* CSS-like Photoshop adjustments */
.layer {
    contrast: 120%;
    saturation: -20%;
    brightness: 105%;
    hue: 15deg;
    blur: 2px;
    opacity: 85%;
}`);

    // Update CSS code when initialCSS changes
    useEffect(() => {
        if (initialCSS) {
            setCssCode(initialCSS);
        }
    }, [initialCSS]);

    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const textareaRef = useRef(null);

    const handleApply = () => {
        if (onApply) {
            onApply(cssCode);
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        
        setIsGenerating(true);
        try {
            if (onGenerate) {
                const generatedCode = await onGenerate(prompt);
                setCssCode(generatedCode);
            }
        } catch (error) {
            console.error("Generation failed:", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const newValue = cssCode.substring(0, start) + '    ' + cssCode.substring(end);
            setCssCode(newValue);
            setTimeout(() => {
                e.target.selectionStart = e.target.selectionEnd = start + 4;
            }, 0);
        }
    };

    return (
        <div className="css-editor">
            <div className="editor-header">
                <h3>CSS-like Photoshop Editor</h3>
                <div className="header-actions">
                    <sp-button 
                        variant="cta" 
                        onClick={handleApply}
                        disabled={!cssCode.trim()}
                    >
                        Apply to Layer
                    </sp-button>
                </div>
            </div>

            <div className="generation-section">
                <div className="prompt-input">
                    <sp-textfield
                        placeholder="Describe the look you want (e.g., 'moody film noir style')"
                        value={prompt}
                        onInput={(e) => setPrompt(e.target.value)}
                        size="m"
                    />
                    <sp-button 
                        variant="secondary"
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || isGenerating}
                    >
                        {isGenerating ? "Generating..." : "Generate CSS"}
                    </sp-button>
                </div>
            </div>

            <div className="code-editor">
                <sp-textarea
                    ref={textareaRef}
                    value={cssCode}
                    onInput={(e) => setCssCode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Write CSS-like code here..."
                    rows={15}
                    className="code-textarea"
                />
            </div>

            <div className="editor-footer">
                <div className="syntax-help">
                    <h4>Supported Properties:</h4>
                    <ul>
                        <li><code>contrast: 120%</code> - Adjust contrast</li>
                        <li><code>saturation: -20%</code> - Adjust saturation</li>
                        <li><code>brightness: 105%</code> - Adjust brightness</li>
                        <li><code>hue: 15deg</code> - Adjust hue</li>
                        <li><code>blur: 2px</code> - Apply blur</li>
                        <li><code>opacity: 85%</code> - Adjust opacity</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}; 