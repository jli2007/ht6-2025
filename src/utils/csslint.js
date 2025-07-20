/**
 * Simplified CSSLint for UXP Plugin
 * Provides CSS validation without external dependencies
 */

window.CSSLint = {
  verify: function(cssText) {
    const messages = [];
    const lines = cssText.split('\n');
    
    // CSSLint rules
    const rules = {
      // Check for missing semicolons
      'missing-semicolon': function(line, lineNum) {
        const trimmed = line.trim();
        if (trimmed.includes(':') && !trimmed.includes(';') && 
            !trimmed.includes('{') && !trimmed.includes('}') && 
            !trimmed.startsWith('/*') && !trimmed.startsWith('//')) {
          messages.push({
            type: 'error',
            line: lineNum,
            col: line.indexOf(':') + 1,
            message: 'Missing semicolon',
            evidence: trimmed
          });
        }
      },
      
      // Check for duplicate properties
      'duplicate-properties': function(cssText) {
        const blocks = cssText.match(/\{[^}]+\}/g) || [];
        blocks.forEach((block, blockIndex) => {
          const properties = {};
          const lines = block.split('\n');
          lines.forEach((line, lineIndex) => {
            const match = line.match(/^\s*([a-zA-Z-]+)\s*:/);
            if (match) {
              const prop = match[1];
              if (properties[prop]) {
                messages.push({
                  type: 'warning',
                  line: lineIndex + 1,
                  col: line.indexOf(':') + 1,
                  message: `Duplicate property '${prop}'`,
                  evidence: line.trim()
                });
              } else {
                properties[prop] = true;
              }
            }
          });
        });
      },
      
      // Check for invalid properties
      'invalid-properties': function(line, lineNum) {
        const match = line.match(/^\s*([a-zA-Z-]+)\s*:/);
        if (match) {
          const prop = match[1];
          const validProps = [
            'blur', 'brightness', 'contrast', 'saturation', 'hue-shift',
            'temperature', 'tint', 'vibrance', 'exposure', 'opacity',
            'drop-shadow', 'inner-shadow', 'outer-glow', 'stroke',
            'color-overlay', 'gradient-overlay', 'noise', 'grain', 'vignette'
          ];
          
          if (!validProps.includes(prop)) {
            messages.push({
              type: 'warning',
              line: lineNum,
              col: line.indexOf(':') + 1,
              message: `Unknown property '${prop}'`,
              evidence: line.trim()
            });
          }
        }
      },
      
      // Check for invalid values
      'invalid-values': function(line, lineNum) {
        const trimmed = line.trim();
        
        // Check for invalid units
        const unitMatch = trimmed.match(/:\s*([^;]+)/);
        if (unitMatch) {
          const value = unitMatch[1].trim();
          
          // Check for invalid units in numeric values
          const numericMatch = value.match(/(-?\d+(?:\.\d+)?)([a-zA-Z%]+)/);
          if (numericMatch) {
            const unit = numericMatch[2];
            const validUnits = ['px', 'deg', '%', 'em', 'rem', 'vh', 'vw'];
            
            if (!validUnits.includes(unit)) {
              messages.push({
                type: 'warning',
                line: lineNum,
                col: line.indexOf(value) + 1,
                message: `Invalid unit '${unit}'`,
                evidence: line.trim()
              });
            }
          }
        }
      },
      
      // Check for empty rules
      'empty-rules': function(cssText) {
        const emptyBlocks = cssText.match(/\{[^}]*\}/g) || [];
        emptyBlocks.forEach((block, index) => {
          const content = block.replace(/[{}]/g, '').trim();
          if (!content) {
            messages.push({
              type: 'warning',
              line: index + 1,
              col: 1,
              message: 'Empty rule set',
              evidence: block
            });
          }
        });
      },
      
      // Check for missing braces
      'missing-braces': function(cssText) {
        const openBraces = (cssText.match(/\{/g) || []).length;
        const closeBraces = (cssText.match(/\}/g) || []).length;
        
        if (openBraces !== closeBraces) {
          messages.push({
            type: 'error',
            line: 1,
            col: 1,
            message: `Mismatched braces: ${openBraces} opening, ${closeBraces} closing`,
            evidence: cssText
          });
        }
      }
    };
    
    // Run all rules
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      rules['missing-semicolon'](line, lineNum);
      rules['invalid-properties'](line, lineNum);
      rules['invalid-values'](line, lineNum);
    });
    
    rules['duplicate-properties'](cssText);
    rules['empty-rules'](cssText);
    rules['missing-braces'](cssText);
    
    return {
      messages: messages,
      stats: {
        errors: messages.filter(m => m.type === 'error').length,
        warnings: messages.filter(m => m.type === 'warning').length
      }
    };
  }
};