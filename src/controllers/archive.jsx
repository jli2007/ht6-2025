// IGNORE

  // /**
  //  * Execute CSS operations via UXP APIs
  //  */
  // async executeOperations(operations) {
  //   await core.executeAsModal(async () => {
  //     const doc = app.activeDocument;
  //     for (const op of operations) {
  //       const layer =
  //         doc.layers.find((l) => l.name === op.layerName) ||
  //         (await doc.createLayer({ name: op.layerName }));
  //       doc.activeLayer = layer;

  //       switch (op.type) {
  //         case "gaussianBlur":
  //           await layer.applyGaussianBlur(op.radius);
  //           break;
  //         case "opacity":
  //           layer.opacity = op.value;
  //           break;
  //         case "hueAdjustment":
  //           await layer.applyHueSaturation({
  //             hue: op.hue,
  //             saturation: 0,
  //             lightness: 0,
  //           });
  //           break;
  //         case "brightnessContrast":
  //           await layer.applyBrightnessContrast({
  //             brightness: op.brightness || 0,
  //             contrast: op.contrast || 0,
  //           });
  //           break;
  //         case "saturationAdjustment":
  //           await layer.applyHueSaturation({
  //             hue: 0,
  //             saturation: op.saturation,
  //             lightness: 0,
  //           });
  //           break;
  //         default:
  //           console.warn("Unsupported operation", op);
  //       }
  //     }
  //   });
  // }

  // /**
  //  * Group operations by layer
  //  */
  // groupOperationsByLayer(operations) {
  //   const grouped = {};
  //   operations.forEach((op) => {
  //     if (!grouped[op.layerName]) {
  //       grouped[op.layerName] = [];
  //     }
  //     grouped[op.layerName].push(op);
  //   });
  //   return grouped;
  // }