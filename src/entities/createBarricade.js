import * as THREE from 'three';
import { Transform } from '../components/Transform.js';
import { Health } from '../components/Health.js';
import { Collider } from '../components/Collider.js';
import { MeshRef } from '../components/MeshRef.js';
import { Barricade } from '../components/Barricade.js';
import { VoxelBuilder } from '../rendering/VoxelBuilder.js';

export function createBarricade(entityManager, scene, position) {
  const group = new THREE.Group();

  // Main block
  const block = VoxelBuilder.cube(1.0, 1.2, 1.0, 0x886644);
  block.position.y = 0.6;
  group.add(block);

  // Plank detail
  const plank = VoxelBuilder.cube(1.1, 0.15, 0.15, 0x775533);
  plank.position.set(0, 0.9, 0.45);
  plank.rotation.z = 0.2;
  group.add(plank);

  const plank2 = VoxelBuilder.cube(1.1, 0.15, 0.15, 0x775533);
  plank2.position.set(0, 0.4, -0.45);
  plank2.rotation.z = -0.15;
  group.add(plank2);

  scene.add(group);

  return entityManager.createEntity()
    .addTag('barricade')
    .addComponent(new Transform(new THREE.Vector3(position.x, 0, position.z), 0))
    .addComponent(new Health(60, 60))
    .addComponent(new Collider(0.6, 'base', true))
    .addComponent(new Barricade())
    .addComponent(new MeshRef(group));
}
