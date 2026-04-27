import * as THREE from 'three';
import { VoxelBuilder } from './VoxelBuilder.js';

export function createDualGunTurretModel() {
  const group = new THREE.Group();

  // Wider base platform
  const base = VoxelBuilder.cube(1.4, 0.4, 1.4, 0x556666);
  base.position.y = 0.2;
  group.add(base);

  // Pedestal
  const pedestal = VoxelBuilder.cube(0.7, 0.65, 0.7, 0x778888);
  pedestal.position.y = 0.72;
  group.add(pedestal);

  // Rotating head
  const head = new THREE.Group();
  head.name = 'turretHead';

  // Head body — wider to hold two barrels
  const headBody = VoxelBuilder.cube(1.0, 0.5, 0.6, 0x556666);
  headBody.position.y = 0;
  head.add(headBody);

  // Left barrel
  const barrelL = VoxelBuilder.cube(0.12, 0.12, 1.1, 0x334444);
  barrelL.position.set(-0.25, 0.05, 0.6);
  head.add(barrelL);

  // Right barrel
  const barrelR = VoxelBuilder.cube(0.12, 0.12, 1.1, 0x334444);
  barrelR.position.set(0.25, 0.05, 0.6);
  head.add(barrelR);

  // Left muzzle tip
  const muzzleL = VoxelBuilder.cube(0.16, 0.16, 0.08, 0xffaa00);
  muzzleL.position.set(-0.25, 0.05, 1.16);
  head.add(muzzleL);

  // Right muzzle tip
  const muzzleR = VoxelBuilder.cube(0.16, 0.16, 0.08, 0xffaa00);
  muzzleR.position.set(0.25, 0.05, 1.16);
  head.add(muzzleR);

  head.position.y = 1.2;
  group.add(head);

  // Cyan indicator light
  const light = VoxelBuilder.cube(0.2, 0.15, 0.2, 0x44cccc);
  light.material = new THREE.MeshLambertMaterial({
    color: 0x44cccc,
    emissive: 0x22aaaa,
    emissiveIntensity: 0.5,
  });
  light.position.y = 1.6;
  group.add(light);

  return group;
}
