import * as THREE from 'three';
import { VoxelBuilder } from './VoxelBuilder.js';

export function createFlameTurretModel() {
  const group = new THREE.Group();

  // Base platform
  const base = VoxelBuilder.cube(1.3, 0.4, 1.3, 0x554444);
  base.position.y = 0.2;
  group.add(base);

  // Fuel tank (round-ish via stacked cubes)
  const tank = VoxelBuilder.cube(0.8, 0.7, 0.8, 0x883322);
  tank.position.y = 0.75;
  group.add(tank);

  // Rotating head
  const head = new THREE.Group();
  head.name = 'turretHead';

  // Nozzle housing
  const housing = VoxelBuilder.cube(0.6, 0.45, 0.5, 0x444444);
  housing.position.y = 0;
  head.add(housing);

  // Wide nozzle barrel
  const nozzle = VoxelBuilder.cube(0.35, 0.25, 0.7, 0x333333);
  nozzle.position.set(0, -0.05, 0.45);
  head.add(nozzle);

  // Flame tip (orange glow)
  const tip = VoxelBuilder.cube(0.3, 0.2, 0.1, 0xff6600);
  tip.material = new THREE.MeshBasicMaterial({ color: 0xff6600, fog: false });
  tip.name = 'flameTip';
  tip.position.set(0, -0.05, 0.8);
  head.add(tip);

  head.position.y = 1.25;
  group.add(head);

  // Orange indicator light
  const light = VoxelBuilder.cube(0.2, 0.15, 0.2, 0xff6600);
  light.material = new THREE.MeshLambertMaterial({
    color: 0xff6600,
    emissive: 0xff4400,
    emissiveIntensity: 0.6,
  });
  light.position.y = 1.65;
  group.add(light);

  return group;
}
