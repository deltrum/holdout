import * as THREE from 'three';
import { VoxelBuilder } from './VoxelBuilder.js';

export function createMinigunTurretModel() {
  const group = new THREE.Group();

  // Heavy base
  const base = VoxelBuilder.cube(1.5, 0.5, 1.5, 0x555555);
  base.position.y = 0.25;
  group.add(base);

  // Ammo box on the side
  const ammoBox = VoxelBuilder.cube(0.6, 0.4, 0.5, 0x556633);
  ammoBox.position.set(-0.7, 0.55, 0);
  group.add(ammoBox);

  // Sturdy pedestal
  const pedestal = VoxelBuilder.cube(0.8, 0.7, 0.8, 0x777777);
  pedestal.position.y = 0.85;
  group.add(pedestal);

  // Rotating head
  const head = new THREE.Group();
  head.name = 'turretHead';

  // Head housing — chunky
  const housing = VoxelBuilder.cube(0.9, 0.6, 0.7, 0x444444);
  housing.position.y = 0;
  head.add(housing);

  // Multi-barrel cluster (6 barrels in a circle pattern)
  const barrelColors = [0x333333, 0x3a3a3a, 0x2e2e2e];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const bx = Math.cos(angle) * 0.14;
    const by = Math.sin(angle) * 0.14;
    const barrel = VoxelBuilder.cube(0.08, 0.08, 1.3, barrelColors[i % 3]);
    barrel.position.set(bx, by, 0.7);
    head.add(barrel);
  }

  // Barrel shroud (outer ring)
  const shroud = VoxelBuilder.cube(0.5, 0.5, 0.2, 0x3a3a3a);
  shroud.position.set(0, 0, 1.3);
  head.add(shroud);

  // Muzzle flash ring
  const muzzle = VoxelBuilder.cube(0.4, 0.4, 0.06, 0xffaa00);
  muzzle.name = 'muzzleTip';
  muzzle.position.set(0, 0, 1.42);
  head.add(muzzle);

  head.position.y = 1.35;
  group.add(head);

  // Red indicator light
  const light = VoxelBuilder.cube(0.22, 0.18, 0.22, 0xff2222);
  light.material = new THREE.MeshLambertMaterial({
    color: 0xff2222,
    emissive: 0xcc0000,
    emissiveIntensity: 0.6,
  });
  light.position.y = 1.8;
  group.add(light);

  return group;
}
