# Chroma • CSS for Photoshop™

[![Photoshop Plugin](https://img.shields.io/badge/Photoshop-Plugin-blue?logo=adobe-photoshop)](https://www.adobe.com/products/photoshop.html)
[![UXP Platform](https://img.shields.io/badge/UXP-5.6+-green)](https://developer.adobe.com/photoshop/uxp/)
[![React](https://img.shields.io/badge/React-16.8+-61dafb?logo=react)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-red)](LICENSE)

> **Transform your Photoshop workflow with AI-powered CSS styling**

Chroma is a revolutionary Photoshop plugin that bridges the gap between web design and photo editing. Extract visual styles from any image using AI, generate custom CSS-like styling rules, and apply them directly to Photoshop layers with unprecedented precision and control.

## ✨ Features

### 🎨 **AI-Powered Style Extraction**
- **Image Analysis**: Upload any inspiration image and let AI analyze its visual characteristics
- **Style Transfer**: Extract colors, contrast, effects, and mood into precise CSS-like rules
- **Gemini Integration**: Powered by Google's Gemini 2.5 Flash for advanced visual analysis

### 💻 **Smart CSS Editor**
- **Real-time Syntax Highlighting**: Professional code editor with CSS validation
- **Live Preview**: See changes applied instantly to your Photoshop layers
- **Error Detection**: Built-in CSS linting with helpful error messages
- **Auto-completion**: Intelligent code suggestions for Photoshop-specific properties

### 🎯 **Photoshop Integration**
- **Direct Layer Styling**: Apply styles directly to selected Photoshop layers
- **Adjustment Layers**: Automatically creates and manages adjustment layers
- **Property Mapping**: Converts CSS properties to native Photoshop adjustments
- **Batch Operations**: Apply consistent styling across multiple layers

### 🔧 **Advanced Properties**
Support for 20+ Photoshop-specific CSS properties:
- **Color Adjustments**: `brightness`, `contrast`, `saturation`, `hue-shift`, `vibrance`
- **Temperature & Tint**: `temperature`, `tint` for color grading
- **Effects**: `blur`, `noise`, `grain`, `vignette`
- **Shadows & Glows**: `drop-shadow`, `inner-shadow`, `outer-glow`
- **Blending**: `opacity`, `blending-mode`, `fill-opacity`
- **Overlays**: `color-overlay`, `gradient-overlay`, `stroke`

### 📤 **Export & Sharing**
- **Web Export**: Convert Photoshop styles to standard CSS filters
- **File Download**: Generate downloadable CSS files for web projects
- **Console Logging**: Detailed operation logs with copy-to-clipboard functionality

## 🚀 Quick Start

### Prerequisites

- **Photoshop**: Version 26.8.1 or higher
- **UXP Platform**: Version 5.6 or higher
- **Node.js**: Version 14 or higher
- **npm**: Latest version recommended

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/chroma-photoshop-plugin.git
   cd chroma-photoshop-plugin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API Key**
   Create a `.env` file in the project root:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   
   > **Get your API key**: Visit [Google AI Studio](https://makersuite.google.com/app/apikey) to create a Gemini API key

4. **Build the plugin**
   ```bash
   npm run build
   ```

5. **Load in Photoshop**
   - Open **UXP Developer Tools**
   - Click "Add Plugin..." and select `dist/manifest.json`
   - Click "Load" to activate the plugin
   - Switch to Photoshop and find "Demo Panel" in the Plugins menu

### Development Mode

For active development with auto-reload:
```bash
npm run watch
```

## 📖 Usage Guide

### Basic Workflow

1. **Select a Layer**: Choose the layer you want to style in Photoshop
2. **Generate Styles**: Use one of two methods:
   - **Text Prompt**: Describe the desired look (e.g., "vintage 70s film")
   - **Image Upload**: Upload an inspiration image for style extraction
3. **Review & Edit**: Modify the generated CSS in the code editor
4. **Apply**: Click "Save" to apply styles to your layer
5. **Export**: Use "Export for Web" to generate standard CSS

### AI Style Generation

#### Text-to-Style
Enter descriptive prompts like:
- `"hot pink barbie"` - Bright, poppy, intensely pink style
- `"vintage 70s film"` - Warm, faded, film grain aesthetic
- `"cyberpunk neon"` - Dark, high-contrast, vibrant blues
- `"dramatic film noir"` - Classic black and white with extreme contrast
- `"Wes Anderson pastel"` - Flat, bright, muted color palette
- `"2016 Instagram filter"` - Punchy, high-saturation look

#### Image-to-Style
1. Click "Browse for inspiration image"
2. Select any image file (JPG, PNG, WebP)
3. Click "Extract Style" to analyze and generate CSS
4. The AI will identify colors, contrast, effects, and mood

### CSS Property Reference

#### Color Adjustments
```css
#layer1 {
  brightness: 15;        /* -100 to 100 */
  contrast: 25;          /* -100 to 100 */
  saturation: -20;       /* -100 to 100 */
  hue-shift: 12deg;      /* -180deg to 180deg */
  vibrance: 45;          /* -100 to 100 */
  temperature: 18;       /* -100 to 100 */
  tint: -5;              /* -100 to 100 */
}
```

#### Effects & Filters
```css
#layer1 {
  blur: 0.3px;           /* 0px to 100px */
  grain: 12;             /* 0 to 100 */
  noise: 8;              /* 0 to 100 */
  vignette: 35;          /* 0 to 100 */
  drop-shadow: #000 4px 4px 12px;
  outer-glow: #00FFFF 18px;
}
```

#### Blending & Opacity
```css
#layer1 {
  opacity: 0.9;          /* 0 to 1 */
  blending-mode: "multiply";
  fill-opacity: 0.8;     /* 0 to 1 */
}
```

## 🛠️ Development

### Project Structure
```
chroma-photoshop-plugin/
├── src/
│   ├── components/
│   │   ├── Terminal.jsx          # Main plugin interface
│   │   ├── CSSEditor.jsx         # Code editor component
│   │   ├── Terminal.css          # Main styles
│   │   └── CSSEditor.css         # Editor styles
│   ├── controllers/
│   │   ├── PhotoshopController.jsx # Photoshop API integration
│   │   └── CommandController.jsx   # Command handling
│   ├── utils/
│   │   └── csslint.js            # CSS validation
│   └── index.jsx                 # Entry point
├── plugin/
│   ├── manifest.json             # Plugin configuration
│   └── images/                   # Plugin assets
├── public/                       # Static assets
└── dist/                         # Built plugin (generated)
```

### Key Components

#### Terminal.jsx
The main plugin interface featuring:
- AI-powered style generation
- Image upload and analysis
- CSS code editing
- Console logging
- Export functionality

#### PhotoshopController.jsx
Handles all Photoshop API interactions:
- Layer selection and manipulation
- Adjustment layer creation
- CSS property mapping
- Error handling and logging

#### CSSEditor.jsx
Professional code editor with:
- Syntax highlighting
- Real-time validation
- Error detection
- Auto-completion

### Available Scripts

```bash
# Development
npm run watch          # Build with auto-reload
npm run build          # Production build

# UXP Commands
npm run uxp:load       # Load plugin in UXP
npm run uxp:reload     # Reload plugin
npm run uxp:watch      # Watch and auto-reload
npm run uxp:debug      # Debug mode
```

### Environment Variables

Create a `.env` file for configuration:
```bash
GEMINI_API_KEY=your_api_key_here
```

### API Integration

The plugin integrates with Google's Gemini API for AI-powered style analysis:

```javascript
// Example API call structure
const requestBody = {
  contents: [{
    parts: [
      { text: "Style analysis prompt..." },
      { inlineData: { mimeType: "image/jpeg", data: "base64..." } }
    ]
  }]
};
```

## 🔧 Configuration

### Plugin Manifest
Key configuration in `plugin/manifest.json`:
- **Minimum Photoshop Version**: 26.8.1
- **Required Permissions**: File system, network access, code generation
- **Panel Sizing**: 230x300 minimum, 2000x2000 maximum
- **Network Domains**: Google APIs for Gemini integration

### Build Configuration
Webpack configuration in `webpack.config.js`:
- React JSX transformation
- CSS and image loading
- Environment variable injection
- Plugin file copying

## 🐛 Troubleshooting

### Common Issues

#### Plugin Won't Load
- Ensure Photoshop version is 26.8.1+
- Check UXP Developer Tools connection
- Verify manifest.json is in dist folder
- Restart Photoshop and UXP Developer Tools

#### API Key Issues
- Verify `.env` file exists in project root
- Check API key is valid and has Gemini access
- Ensure network permissions are granted
- Test API key in Google AI Studio

#### Build Errors
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version compatibility
- Verify all dependencies are installed
- Check for syntax errors in source files

#### Style Application Issues
- Ensure a layer is selected in Photoshop
- Check CSS syntax for errors
- Verify property names are correct
- Check console for detailed error messages

### Debug Mode
Enable debug logging:
```bash
npm run uxp:debug
```

Check console output in UXP Developer Tools for detailed error information.

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with proper documentation
4. **Test thoroughly** in Photoshop
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Guidelines
- Follow existing code style and conventions
- Add comprehensive error handling
- Include console logging for debugging
- Test with various Photoshop versions
- Update documentation for new features

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Adobe UXP Team** for the excellent platform
- **Google Gemini** for AI-powered style analysis
- **React Community** for the amazing ecosystem
- **CodeMirror** for the professional code editor

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/chroma-photoshop-plugin/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/chroma-photoshop-plugin/discussions)
- **Documentation**: [Wiki](https://github.com/your-username/chroma-photoshop-plugin/wiki)

---

**Made with ❤️ for the Photoshop community**

*Chroma • CSS for Photoshop™ - Where AI meets creativity*