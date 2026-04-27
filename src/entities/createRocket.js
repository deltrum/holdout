import * as THREE from 'three';
import { Transform } from '../components/Transform.js';
import { Velocity } from '../components/Velocity.js';
import { Collider } from '../components/Collider.js';
import { Lifetime } from '../components/Lifetime.js';
import { Damage } from '../components/Damage.js';
import { Rocket } from '../components/Rocket.js';
import { MeshRef } from '../components/MeshRef.js';
import { createRocketModel } from '../rendering/RocketModel.js';

export function createRocket(
  entityManager,
  scene,
  origin,
  direction,
  speed,
  damage,
  explosionRadius,
  explosionDamage,
  options = {},
) {
  const { homing = false, scale = 1 } = options;

  const mesh = createRocketModel();
  if (scale !== 1) mesh.scale.setScalar(scale);
  scene.add(mesh);

  const rotation = Math.atan2(direction.x, direction.z);

  const entity = entityManager.createEntity()
    .addTag('projectile')
    .addTag('rocket')
    .addComponent(new Transform(origin.clone(), rotation))
    .addComponent(new Velocity(direction.clone().normalize(), speed))
    .addComponent(new Collider(0.25 * scale, 'projectile'))
    .addComponent(new Lifetime(3.0))
    .addComponent(new Damage(damage))
    .addComponent(new Rocket(explosionRadius, explosionDamage))
    .addComponent(new MeshRef(mesh));

  if (homing) entity.addTag('homing');
  return entity;
}
