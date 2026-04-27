import * as THREE from 'three';
import { Transform } from '../components/Transform.js';
import { Collider } from '../components/Collider.js';
import { MeshRef } from '../components/MeshRef.js';
import { Mine } from '../components/Mine.js';
import { createMineModel } from '../rendering/MineModel.js';

export function createMine(entityManager, scene, position, explosionRadius = 4, explosionDamage = 50) {
  const mesh = createMineModel();
  scene.add(mesh);

  return entityManager.createEntity()
    .addTag('mine')
    .addComponent(new Transform(new THREE.Vector3(position.x, 0, position.z), 0))
    .addComponent(new Collider(0.35, 'base', true))
    .addComponent(new Mine(explosionRadius, explosionDamage, 1.5))
    .addComponent(new MeshRef(mesh));
}
