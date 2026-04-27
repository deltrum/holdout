import * as THREE from 'three';
import { VoxelBuilder } from './VoxelBuilder.js';

export function createLaserTurretModel() {
  const group = new THREE.Group();

  // Sleek base
  const base = VoxelBuilder.cube(1.3, 0.4, 1.3, 0x334455);
  base.position.y = 0.2;
  group.add(base);

  // Tech pedestal
  const pedestal = VoxelBuilder.cube(0.6, 0.7, 0.6, 0x445566);
  pedestal.position.y = 0.75;
  group.add(pedestal);

  // Energy core (glowing)
  const coreGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x00ccff, fog: false });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.position.y = 1.15;
  core.name = 'laserCore';
  group.add(core);

  // Rotating head
  const head = new THREE.Group();
  head.name = 'turretHead';

  // Emitter housing
  const housing = VoxelBuilder.cube(0.7, 0.4, 0.5, 0x3a4a5a);
  housing.position.y = 0;
  head.add(housing);

  // Emitter barrel — thin and long
  const barrel = VoxelBuilder.cube(0.1, 0.1, 0.9, 0x556677);
  barrel.position.set(0, 0, 0.5);
  head.add(barrel);

  // Emitter tip (cyan glow)
  const tipGeo = new THREE.BoxGeometry(0.15, 0.15, 0.1);
  const tipMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, fog: false });
  const tip = new THREE.Mesh(tipGeo, tipMat);
  tip.position.set(0, 0, 0.96);
  tip.name = 'emitterTip';
  head.add(tip);

  head.position.y = 1.4;
  group.add(head);

  // Cyan indicator
  const light = VoxelBuilder.cube(0.2, 0.12, 0.2, 0x00ffcc);
  light.material = new THREE.MeshLambertMaterial({
    color: 0x00ffcc,
    emissive: 0x00aa88,
    emissiveIntensity: 0.6,
  });
  light.position.y = 1.75;
  group.add(light);

  return group;
}
