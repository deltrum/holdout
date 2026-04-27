import * as THREE from 'three';

const PLAYER_COLORS = {
  1: { body: 0x2277ff, bodyDark: 0x1155cc, legs: 0x1144aa, skin: 0xffddaa, gun: 0x444444, accent: 0x66bbff },
  2: { body: 0xff8811, bodyDark: 0xdd6600, legs: 0xaa5500, skin: 0xffddaa, gun: 0x444444, accent: 0xffcc44 },
};

function fogFreeCube(width, height, depth, color) {
  const geo = new THREE.BoxGeometry(width, height, depth);
  const mat = new THREE.MeshBasicMaterial({ color, fog: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

export function createPlayerModel(playerIndex = 1) {
  const c = PLAYER_COLORS[playerIndex] || PLAYER_COLORS[1];
  const group = new THREE.Group();

  const parts = [
    { name: 'body', size: [0.6, 0.8, 0.4], offset: [0, 0.9, 0], color: c.body },
    { name: 'head', size: [0.5, 0.5, 0.5], offset: [0, 1.55, 0], color: c.skin },
    { name: 'helmet', size: [0.52, 0.2, 0.52], offset: [0, 1.75, 0], color: c.accent },
    { name: 'leftArm', size: [0.2, 0.6, 0.2], offset: [-0.4, 0.9, 0], color: c.bodyDark },
    { name: 'rightArm', size: [0.2, 0.6, 0.2], offset: [0.4, 0.9, 0], color: c.bodyDark },
    { name: 'leftLeg', size: [0.25, 0.5, 0.25], offset: [-0.15, 0.25, 0], color: c.legs },
    { name: 'rightLeg', size: [0.25, 0.5, 0.25], offset: [0.15, 0.25, 0], color: c.legs },
    { name: 'gun', size: [0.1, 0.1, 0.6], offset: [0.4, 0.85, 0.35], color: c.gun },
  ];

  for (const part of parts) {
    const mesh = fogFreeCube(part.size[0], part.size[1], part.size[2], part.color);
    mesh.position.set(part.offset[0], part.offset[1], part.offset[2]);
    mesh.name = part.name;
    group.add(mesh);
  }

  return group;
}
