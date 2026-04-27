import * as THREE from 'three';
import { VoxelBuilder } from './VoxelBuilder.js';

export function createRocketTurretModel() {
  const group = new THREE.Group();

  // Wider base platform
  const base = VoxelBuilder.cube(1.4, 0.4, 1.4, 0x555555);
  base.position.y = 0.2;
  group.add(base);

  // Pedestal
  const pedestal = VoxelBuilder.cube(0.7, 0.7, 0.7, 0x777777);
  pedestal.position.y = 0.75;
  group.add(pedestal);

  // Rotating head
  const head = new THREE.Group();
  head.name = 'turretHead';

  // Head body — wider for rocket launcher
  const headBody = VoxelBuilder.cube(0.9, 0.6, 0.7, 0x664433);
  headBody.position.y = 0;
  head.add(headBody);

  // Launcher tube (wide barrel)
  const barrel = VoxelBuilder.cube(0.3, 0.3, 1.1, 0x443322);
  barrel.position.set(0, 0.05, 0.6);
  head.add(barrel);

  // Barrel opening highlight
  const opening = VoxelBuilder.cube(0.25, 0.25, 0.05, 0x221111);
  opening.position.set(0, 0.05, 1.16);
  head.add(opening);

  head.position.y = 1.25;
  group.add(head);

  // Red indicator light
  const light = VoxelBuilder.cube(0.2, 0.15, 0.2, 0xff4422);
  light.material = new THREE.MeshLambertMaterial({
    color: 0xff4422,
    emissive: 0xcc2200,
    emissiveIntensity: 0.6,
  });
  light.position.y = 1.7;
  group.add(light);

  return group;
}
