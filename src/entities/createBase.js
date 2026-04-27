import * as THREE from 'three';
import { Transform } from '../components/Transform.js';
import { Health } from '../components/Health.js';
import { Collider } from '../components/Collider.js';
import { MeshRef } from '../components/MeshRef.js';
import { createBaseModel } from '../rendering/BaseModel.js';
import { CONFIG } from '../config/gameConfig.js';

export function createBase(entityManager, scene) {
  const mesh = createBaseModel();
  scene.add(mesh);

  return entityManager.createEntity()
    .addTag('base')
    .addComponent(new Transform(new THREE.Vector3(0, 0, 0), 0))
    .addComponent(new Health(CONFIG.base.health, CONFIG.base.health))
    .addComponent(new Collider(CONFIG.base.colliderRadius, 'base', true))
    .addComponent(new MeshRef(mesh));
}
