import React, { useEffect, useRef, useState } from 'react';
import './CSSEditor.css';
import '../utils/csslint.js';

// CSS Editor with CSSLint integration
const CSSEditor = ({ value, onChange, placeholder = "Enter your CSS styles here..." }) => {
  const textareaRef = useRef(null);
  const [errorCount, setErrorCount] = useState(0);
  const [warningCount, setWarningCount] = useState(0);
  const [lintMessages, setLintMessages] = useState([]);

  useEffect(() => {
    // Initialize the editor
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // CSSLint validation
  const validateCSS = (code) => {
    if (!window.CSSLint || !code.trim()) {
      setErrorCount(0);
      setWarningCount(0);
      setLintMessages([]);
      return;
    }

    try {
      const results = window.CSSLint.verify(code);
      setErrorCount(results.stats.errors);
      setWarningCount(results.stats.warnings);
      setLintMessages(results.messages);
    } catch (error) {
      console.error('CSSLint validation failed:', error);
      setErrorCount(0);
      setWarningCount(0);
      setLintMessages([]);
    }
  };

  // Handle textarea changes
  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange?.(newValue);
    validateCSS(newValue);
  };

  // Initial validation on mount
  useEffect(() => {
    validateCSS(value || '');
  }, [value]);

  // Update textarea value when prop changes
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== value) {
      textareaRef.current.value = value || '';
    }
  }, [value]);

  return (
    <div className="css-editor-container">
      <div className="css-editor-header">
        <div className="css-editor-title">
        </div>
        <div className="css-editor-status">
          {errorCount > 0 && (
            <span className="css-editor-error-count">❌ {errorCount} errors</span>
          )}
          {warningCount > 0 && (
            <span className="css-editor-warning-count">⚠️ {warningCount} warnings</span>
          )}
          {errorCount === 0 && warningCount === 0 && (
            <span className="css-editor-success">✅ Valid CSS</span>
          )}
        </div>
      </div>
      
      <div className="css-editor-main">
        <textarea
          ref={textareaRef}
          value={value || ''}
          onChange={handleChange}
          placeholder={placeholder}
          style={{
            width: '100%',
            height: '250px',
            backgroundColor: '#1e1e1e',
            color: '#cccccc',
            border: 'none',
            padding: '1rem',
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '14px',
            lineHeight: '20px',
            resize: 'vertical',
            outline: 'none'
          }}
        />
        
        {/* Lint Messages Panel */}
        {lintMessages.length > 0 && (
          <div className="css-editor-lint-panel">
            <div className="css-editor-lint-header">
              <span className="css-editor-icon">🔍</span>
              <span>Lint Issues</span>
            </div>
            <div className="css-editor-lint-messages">
              {lintMessages.map((message, index) => (
                <div 
                  key={index} 
                  className={`css-editor-lint-message css-editor-lint-message--${message.type}`}
                  onClick={() => {
                    // Scroll to the line with the error
                    if (textareaRef.current) {
                      const lines = value.split('\n');
                      const lineHeight = 20; // Approximate line height
                      const scrollTop = (message.line - 1) * lineHeight;
                      textareaRef.current.scrollTop = scrollTop;
                      textareaRef.current.focus();
                    }
                  }}
                >
                  <span className="css-editor-lint-line">Line {message.line}:</span>
                  <span className="css-editor-lint-text">{message.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CSSEditor; 