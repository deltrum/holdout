import * as THREE from 'three';
import { VoxelBuilder } from './VoxelBuilder.js';

export function createBaseModel() {
  const group = new THREE.Group();

  // Platform
  const platform = VoxelBuilder.cube(4, 0.5, 4, 0x887755);
  platform.position.y = 0.25;
  group.add(platform);

  // Corner pillars
  const pillarPositions = [
    [-1.5, 0, -1.5],
    [1.5, 0, -1.5],
    [-1.5, 0, 1.5],
    [1.5, 0, 1.5],
  ];

  for (const [x, , z] of pillarPositions) {
    const pillar = VoxelBuilder.cube(0.5, 3, 0.5, 0x888888);
    pillar.position.set(x, 1.75, z);
    group.add(pillar);
  }

  // Roof edges
  const roofX = VoxelBuilder.cube(3.5, 0.3, 0.4, 0x995533);
  roofX.position.set(0, 3.35, -1.5);
  group.add(roofX);

  const roofX2 = roofX.clone();
  roofX2.position.set(0, 3.35, 1.5);
  group.add(roofX2);

  const roofZ = VoxelBuilder.cube(0.4, 0.3, 3.5, 0x995533);
  roofZ.position.set(-1.5, 3.35, 0);
  group.add(roofZ);

  const roofZ2 = roofZ.clone();
  roofZ2.position.set(1.5, 3.35, 0);
  group.add(roofZ2);

  // Beacon on top
  const beacon = VoxelBuilder.cube(0.6, 0.8, 0.6, 0xffdd44);
  beacon.position.y = 3.9;
  beacon.material = new THREE.MeshLambertMaterial({ color: 0xffdd44, emissive: 0xffaa00, emissiveIntensity: 0.5 });
  group.add(beacon);

  // Point light at beacon
  const light = new THREE.PointLight(0xffaa44, 1, 15);
  light.position.set(0, 4.5, 0);
  group.add(light);

  return group;
}
