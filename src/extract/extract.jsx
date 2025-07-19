import React, { useState, useRef } from 'react';
import { Upload, Zap, Image as ImageIcon, Code } from 'lucide-react';

const StyleExtractor = ({ currentImage, onStyleExtracted }) => {
  const [referenceImage, setReferenceImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedStyle, setExtractedStyle] = useState(null);
  const fileInputRef = useRef(null);

  const analyzeImage = (imageElement) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    ctx.drawImage(imageElement, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let totalR = 0, totalG = 0, totalB = 0;
    let brightness = 0;
    let contrast = 0;
    let pixelCount = data.length / 4;
    
    // Calculate average color and brightness
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      totalR += r;
      totalG += g;
      totalB += b;
      
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      brightness += luminance;
    }
    
    const avgR = totalR / pixelCount;
    const avgG = totalG / pixelCount;
    const avgB = totalB / pixelCount;
    const avgBrightness = brightness / pixelCount;
    
    // Calculate contrast (standard deviation of luminance)
    let varianceSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      varianceSum += Math.pow(luminance - avgBrightness, 2);
    }
    const stdDev = Math.sqrt(varianceSum / pixelCount);
    
    // Calculate saturation
    let saturationSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      saturationSum += sat;
    }
    const avgSaturation = saturationSum / pixelCount;
    
    // Calculate color temperature (simplified)
    const colorTemp = avgB > avgR ? 'cool' : 'warm';
    const tempStrength = Math.abs(avgB - avgR) / 255;
    
    return {
      avgColor: { r: avgR, g: avgG, b: avgB },
      brightness: avgBrightness / 255,
      contrast: Math.min(stdDev / 128, 2),
      saturation: avgSaturation,
      colorTemperature: colorTemp,
      tempStrength: tempStrength
    };
  };

  const calculateStyleDifferences = (current, reference) => {
    const brightnessDiff = (reference.brightness - current.brightness) * 100;
    const contrastDiff = (reference.contrast - current.contrast) * 100;
    const saturationDiff = (reference.saturation - current.saturation) * 100;
    
    // Color overlay calculation
    const rDiff = reference.avgColor.r - current.avgColor.r;
    const gDiff = reference.avgColor.g - current.avgColor.g;
    const bDiff = reference.avgColor.b - current.avgColor.b;
    
    const colorOverlay = Math.abs(rDiff) > 10 || Math.abs(gDiff) > 10 || Math.abs(bDiff) > 10 
      ? `rgb(${Math.round(reference.avgColor.r)}, ${Math.round(reference.avgColor.g)}, ${Math.round(reference.avgColor.b)})`
      : null;
    
    // Hue shift calculation
    const currentHue = Math.atan2(current.avgColor.g - current.avgColor.r, current.avgColor.b - current.avgColor.r) * 180 / Math.PI;
    const refHue = Math.atan2(reference.avgColor.g - reference.avgColor.r, reference.avgColor.b - reference.avgColor.r) * 180 / Math.PI;
    const hueShift = ((refHue - currentHue + 360) % 360) - 180;
    
    // Color temperature adjustment
    const tempAdjustment = reference.colorTemperature !== current.colorTemperature ? 
      (reference.colorTemperature === 'warm' ? -reference.tempStrength * 50 : reference.tempStrength * 50) : 0;
    
    return {
      brightness: Math.round(brightnessDiff),
      contrast: Math.round(contrastDiff),
      saturation: Math.round(saturationDiff),
      hueShift: Math.round(hueShift),
      colorTemperature: Math.round(tempAdjustment),
      colorOverlay,
      exposure: Math.round(brightnessDiff * 0.5), // Exposure related to brightness
      blendingMode: reference.contrast > current.contrast * 1.5 ? 'overlay' : 'normal',
      opacity: 100 - Math.abs(brightnessDiff) * 0.1
    };
  };

  const generateStyleCode = (differences) => {
    const styleRules = [];
    
    if (Math.abs(differences.brightness) > 5) {
      styleRules.push(`brightness: ${100 + differences.brightness}%`);
    }
    
    if (Math.abs(differences.contrast) > 5) {
      styleRules.push(`contrast: ${100 + differences.contrast}%`);
    }
    
    if (Math.abs(differences.saturation) > 5) {
      styleRules.push(`saturation: ${100 + differences.saturation}%`);
    }
    
    if (Math.abs(differences.hueShift) > 10) {
      styleRules.push(`hue-shift: ${differences.hueShift}deg`);
    }
    
    if (Math.abs(differences.colorTemperature) > 5) {
      styleRules.push(`color-temperature: ${differences.colorTemperature > 0 ? 'warm' : 'cool'} ${Math.abs(differences.colorTemperature)}%`);
    }
    
    if (Math.abs(differences.exposure) > 5) {
      styleRules.push(`exposure: ${differences.exposure}%`);
    }
    
    if (differences.colorOverlay) {
      styleRules.push(`color-overlay: ${differences.colorOverlay} 25%`);
    }
    
    if (differences.blendingMode !== 'normal') {
      styleRules.push(`blending-mode: ${differences.blendingMode}`);
    }
    
    if (differences.opacity < 95) {
      styleRules.push(`opacity: ${Math.round(differences.opacity)}%`);
    }
    
    // Add some default enhancements based on analysis
    if (differences.contrast > 20) {
      styleRules.push(`sharpen: 15%`);
    }
    
    if (differences.brightness < -20) {
      styleRules.push(`drop-shadow: 2px 2px 4px rgba(0,0,0,0.3)`);
    }
    
    return styleRules.join(';\n') + ';';
  };

  const handleUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setReferenceImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!currentImage || !referenceImage) {
      alert('Please ensure both current and reference images are loaded');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Create image elements for analysis
      const currentImg = new Image();
      const refImg = new Image();
      
      const loadImage = (img, src) => {
        return new Promise((resolve) => {
          img.onload = () => resolve();
          img.src = src;
        });
      };
      
      await Promise.all([
        loadImage(currentImg, currentImage),
        loadImage(refImg, referenceImage)
      ]);
      
      // Analyze both images
      const currentAnalysis = analyzeImage(currentImg);
      const referenceAnalysis = analyzeImage(refImg);
      
      // Calculate differences and generate style
      const differences = calculateStyleDifferences(currentAnalysis, referenceAnalysis);
      const styleCode = generateStyleCode(differences);
      
      const extractedStyle = {
        code: styleCode,
        analysis: {
          current: currentAnalysis,
          reference: referenceAnalysis,
          differences: differences
        }
      };
      
      setExtractedStyle(extractedStyle);
      
      // Call parent callback if provided
      if (onStyleExtracted) {
        onStyleExtracted(extractedStyle);
      }
      
    } catch (error) {
      console.error('Error processing images:', error);
      alert('Error processing images. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Style Extractor</h2>
      
      {/* Upload Section */}
      <div className="mb-6">
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {referenceImage ? (
            <div className="space-y-3">
              <img 
                src={referenceImage} 
                alt="Reference" 
                className="max-w-full h-32 object-cover mx-auto rounded"
              />
              <p className="text-sm text-green-600">Reference image loaded</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload className="w-12 h-12 text-gray-400 mx-auto" />
              <p className="text-gray-600">Click to upload reference image</p>
            </div>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {/* Current Image Status */}
      <div className="mb-6 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <ImageIcon className="w-5 h-5 text-gray-600" />
          <span className="text-sm text-gray-600">
            Current Image: {currentImage ? 'Loaded' : 'Not loaded'}
          </span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!currentImage || !referenceImage || isProcessing}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Processing...</span>
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            <span>Extract Style</span>
          </>
        )}
      </button>

      {/* Results */}
      {extractedStyle && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <Code className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-800">Generated Style</h3>
          </div>
          
          <div className="bg-white p-3 rounded border">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
              {extractedStyle.code}
            </pre>
          </div>
          
          <button
            onClick={() => navigator.clipboard.writeText(extractedStyle.code)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Copy to clipboard
          </button>
        </div>
      )}
    </div>
  );
};

export default StyleExtractor;