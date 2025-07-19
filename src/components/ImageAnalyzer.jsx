import React, { useState, useRef } from "react";
import { WC } from "./WC.jsx";
import "./ImageAnalyzer.css";

export const ImageAnalyzer = ({ onAnalyze, onGenerateFromImage }) => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [imageUrl, setImageUrl] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setSelectedImage(e.target.result);
                setImageUrl(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUrlInput = (event) => {
        setImageUrl(event.target.value);
        setSelectedImage(event.target.value);
    };

    const handleAnalyzeCurrentLayer = async () => {
        if (!onAnalyze) return;
        
        setIsAnalyzing(true);
        try {
            const result = await onAnalyze();
            setAnalysisResult(result);
        } catch (error) {
            console.error("Error analyzing current layer:", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGenerateFromImage = async () => {
        if (!selectedImage || !onGenerateFromImage) return;
        
        setIsAnalyzing(true);
        try {
            const result = await onGenerateFromImage(selectedImage);
            setAnalysisResult(result);
        } catch (error) {
            console.error("Error generating from image:", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleClear = () => {
        setSelectedImage(null);
        setImageUrl("");
        setAnalysisResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="image-analyzer">
            <div className="analyzer-header">
                <h3>Image Analysis</h3>
                <div className="header-actions">
                    <sp-button 
                        variant="cta" 
                        size="s"
                        onClick={handleAnalyzeCurrentLayer}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? "Analyzing..." : "Analyze Current Layer"}
                    </sp-button>
                </div>
            </div>

            <div className="image-input-section">
                <div className="input-methods">
                    <div className="file-upload">
                        <sp-button 
                            variant="secondary" 
                            size="s"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            📁 Upload Image
                        </sp-button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                    </div>
                    
                    <div className="url-input">
                        <sp-textfield
                            placeholder="Or paste image URL"
                            value={imageUrl}
                            onInput={handleUrlInput}
                            size="s"
                        />
                    </div>
                </div>

                {selectedImage && (
                    <div className="image-preview">
                        <img src={selectedImage} alt="Reference" />
                        <div className="image-actions">
                            <sp-button 
                                variant="cta" 
                                size="s"
                                onClick={handleGenerateFromImage}
                                disabled={isAnalyzing}
                            >
                                {isAnalyzing ? "Generating..." : "Generate CSS from Image"}
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
                )}
            </div>

            {analysisResult && (
                <div className="analysis-result">
                    <h4>Generated CSS:</h4>
                    <pre className="generated-css">{analysisResult}</pre>
                </div>
            )}

            <div className="analyzer-help">
                <h4>How it works:</h4>
                <ul>
                    <li><strong>Analyze Current Layer:</strong> Analyzes the currently selected layer in Photoshop</li>
                    <li><strong>Upload Image:</strong> Upload a reference image to generate matching CSS</li>
                    <li><strong>Image URL:</strong> Paste a URL to analyze an online image</li>
                </ul>
            </div>
        </div>
    );
}; 