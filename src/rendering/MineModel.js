import * as THREE from 'three';
import { VoxelBuilder } from './VoxelBuilder.js';

export function createMineModel() {
  const group = new THREE.Group();

  // Flat disc body
  const body = VoxelBuilder.cube(0.7, 0.2, 0.7, 0x555555);
  body.position.y = 0.1;
  group.add(body);

  // Pressure plate on top
  const plate = VoxelBuilder.cube(0.4, 0.08, 0.4, 0x888888);
  plate.position.y = 0.24;
  group.add(plate);

  // Red blinking light
  const light = VoxelBuilder.cube(0.12, 0.1, 0.12, 0xff0000);
  light.material = new THREE.MeshBasicMaterial({ color: 0xff0000, fog: false });
  light.name = 'mineLight';
  light.position.y = 0.32;
  group.add(light);

  return group;
}
