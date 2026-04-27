import * as THREE from 'three';
import { VoxelBuilder } from './VoxelBuilder.js';

export function createMortarTurretModel() {
  const group = new THREE.Group();

  // Heavy reinforced base
  const base = VoxelBuilder.cube(1.5, 0.5, 1.5, 0x445544);
  base.position.y = 0.25;
  group.add(base);

  // Ammo rack on side
  const rack = VoxelBuilder.cube(0.4, 0.5, 0.8, 0x556644);
  rack.position.set(-0.8, 0.5, 0);
  group.add(rack);

  // Small rockets on rack
  for (let i = 0; i < 3; i++) {
    const r = VoxelBuilder.cube(0.1, 0.1, 0.35, 0x888888);
    r.position.set(-0.8, 0.8, -0.25 + i * 0.25);
    group.add(r);
  }

  // Pedestal
  const pedestal = VoxelBuilder.cube(0.7, 0.6, 0.7, 0x667766);
  pedestal.position.y = 0.8;
  group.add(pedestal);

  // Rotating launcher head
  const head = new THREE.Group();
  head.name = 'turretHead';

  // Launch tube cluster (4 tubes in 2x2)
  const tubePositions = [[-0.15, 0.1], [0.15, 0.1], [-0.15, -0.1], [0.15, -0.1]];
  for (const [tx, ty] of tubePositions) {
    const tube = VoxelBuilder.cube(0.18, 0.18, 0.7, 0x555555);
    tube.position.set(tx, ty, 0.3);
    head.add(tube);
  }

  // Housing
  const housing = VoxelBuilder.cube(0.6, 0.5, 0.5, 0x556655);
  housing.position.y = 0;
  head.add(housing);

  // Angled upward slightly
  head.rotation.x = -0.3;
  head.position.y = 1.3;
  group.add(head);

  // Yellow indicator light
  const light = VoxelBuilder.cube(0.2, 0.15, 0.2, 0xccaa22);
  light.material = new THREE.MeshLambertMaterial({
    color: 0xccaa22,
    emissive: 0xaa8800,
    emissiveIntensity: 0.5,
  });
  light.position.y = 1.75;
  group.add(light);

  return group;
}
