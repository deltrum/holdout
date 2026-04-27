import * as THREE from 'three';
import { Transform } from '../components/Transform.js';
import { Velocity } from '../components/Velocity.js';
import { Collider } from '../components/Collider.js';
import { Lifetime } from '../components/Lifetime.js';
import { Damage } from '../components/Damage.js';
import { MeshRef } from '../components/MeshRef.js';
import { createProjectileModel } from '../rendering/ProjectileModel.js';
import { CONFIG } from '../config/gameConfig.js';

export function createProjectile(entityManager, scene, origin, direction, speed, damage) {
  const mesh = createProjectileModel();
  scene.add(mesh);

  const rotation = Math.atan2(direction.x, direction.z);

  return entityManager.createEntity()
    .addTag('projectile')
    .addComponent(new Transform(origin.clone(), rotation))
    .addComponent(new Velocity(direction.clone().normalize(), speed))
    .addComponent(new Collider(0.15, 'projectile'))
    .addComponent(new Lifetime(CONFIG.weapon.lifetime))
    .addComponent(new Damage(damage))
    .addComponent(new MeshRef(mesh));
}
