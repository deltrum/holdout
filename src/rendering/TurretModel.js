import * as THREE from 'three';
import { VoxelBuilder } from './VoxelBuilder.js';

export function createTurretModel() {
  const group = new THREE.Group();

  // Base platform
  const base = VoxelBuilder.cube(1.2, 0.4, 1.2, 0x666666);
  base.position.y = 0.2;
  group.add(base);

  // Pedestal
  const pedestal = VoxelBuilder.cube(0.6, 0.6, 0.6, 0x888888);
  pedestal.position.y = 0.7;
  group.add(pedestal);

  // Rotating head (this will be rotated to face target)
  const head = new THREE.Group();
  head.name = 'turretHead';

  // Head body
  const headBody = VoxelBuilder.cube(0.8, 0.5, 0.6, 0x555555);
  headBody.position.y = 0;
  head.add(headBody);

  // Barrel
  const barrel = VoxelBuilder.cube(0.15, 0.15, 1.0, 0x333333);
  barrel.position.set(0, 0, 0.55);
  head.add(barrel);

  // Muzzle tip (glows when firing)
  const muzzle = VoxelBuilder.cube(0.2, 0.2, 0.1, 0xffaa00);
  muzzle.name = 'muzzleTip';
  muzzle.position.set(0, 0, 1.05);
  head.add(muzzle);

  head.position.y = 1.15;
  group.add(head);

  // Small indicator light on top
  const light = VoxelBuilder.cube(0.2, 0.15, 0.2, 0x44ff44);
  light.material = new THREE.MeshLambertMaterial({
    color: 0x44ff44,
    emissive: 0x22aa22,
    emissiveIntensity: 0.5,
  });
  light.position.y = 1.55;
  group.add(light);

  return group;
}
