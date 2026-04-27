import { VoxelBuilder } from './VoxelBuilder.js';

export function createZombieModel(color = 0x4a7c4f, scale = 1.0) {
  const skinColor = color;
  const darkColor = darken(color, 0.7);
  const clothColor = 0x554433;

  let group;

  if (scale >= 1.8) {
    // Brute model — wide, stocky, massive proportions
    const bruteCloth = darken(clothColor, 0.8);
    group = VoxelBuilder.buildCharacter([
      { name: 'body', size: [1.2, 1.0, 0.8], offset: [0, 1.0, 0], color: bruteCloth },
      { name: 'belly', size: [1.1, 0.6, 0.9], offset: [0, 0.6, 0.05], color: bruteCloth },
      { name: 'head', size: [0.6, 0.55, 0.55], offset: [0, 1.8, 0], color: skinColor },
      { name: 'leftArm', size: [0.4, 0.8, 0.4], offset: [-0.8, 1.0, 0.3], color: skinColor },
      { name: 'rightArm', size: [0.4, 0.8, 0.4], offset: [0.8, 1.0, 0.3], color: skinColor },
      { name: 'leftFist', size: [0.35, 0.35, 0.35], offset: [-0.8, 0.5, 0.4], color: darkColor },
      { name: 'rightFist', size: [0.35, 0.35, 0.35], offset: [0.8, 0.5, 0.4], color: darkColor },
      { name: 'leftLeg', size: [0.4, 0.6, 0.4], offset: [-0.3, 0.3, 0], color: darkColor },
      { name: 'rightLeg', size: [0.4, 0.6, 0.4], offset: [0.3, 0.3, 0], color: darkColor },
    ]);
    // Scale only slightly — the model itself is already big
    group.scale.setScalar(scale * 0.55);
  } else {
    // Standard zombie model
    group = VoxelBuilder.buildCharacter([
      { name: 'body', size: [0.6, 0.8, 0.4], offset: [0, 0.9, 0], color: clothColor },
      { name: 'head', size: [0.5, 0.5, 0.5], offset: [0, 1.55, 0], color: skinColor },
      { name: 'leftArm', size: [0.2, 0.55, 0.2], offset: [-0.4, 0.95, 0.35], color: skinColor },
      { name: 'rightArm', size: [0.2, 0.55, 0.2], offset: [0.4, 0.95, 0.35], color: skinColor },
      { name: 'leftLeg', size: [0.25, 0.5, 0.25], offset: [-0.15, 0.25, 0], color: darkColor },
      { name: 'rightLeg', size: [0.25, 0.5, 0.25], offset: [0.15, 0.25, 0], color: darkColor },
    ]);
    group.scale.setScalar(scale);
  }

  return group;
}

function darken(hex, factor) {
  const r = ((hex >> 16) & 0xff) * factor;
  const g = ((hex >> 8) & 0xff) * factor;
  const b = (hex & 0xff) * factor;
  return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
}
