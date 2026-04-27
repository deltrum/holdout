import * as THREE from 'three';
import { Transform } from '../components/Transform.js';
import { Velocity } from '../components/Velocity.js';
import { Health } from '../components/Health.js';
import { Collider } from '../components/Collider.js';
import { ZombieAI } from '../components/ZombieAI.js';
import { ScoreValue } from '../components/ScoreValue.js';
import { MeshRef } from '../components/MeshRef.js';
import { createZombieModel } from '../rendering/ZombieModel.js';
import { ZOMBIE_TYPES } from '../config/zombieTypes.js';
import { angleBetween } from '../utils/math.js';

export function createZombie(entityManager, scene, typeName, spawnPos, targetPos) {
  const config = ZOMBIE_TYPES[typeName];
  const mesh = createZombieModel(config.color, config.scale);
  scene.add(mesh);

  // Direction toward target
  const dir = new THREE.Vector3(
    targetPos.x - spawnPos.x,
    0,
    targetPos.z - spawnPos.z,
  ).normalize();

  const rotation = angleBetween(spawnPos.x, spawnPos.z, targetPos.x, targetPos.z);

  return entityManager.createEntity()
    .addTag('zombie')
    .addTag('enemy')
    .addComponent(new Transform(new THREE.Vector3(spawnPos.x, 0, spawnPos.z), rotation))
    .addComponent(new Velocity(dir, config.speed))
    .addComponent(new Health(config.health, config.health))
    .addComponent(new Collider(config.radius, 'enemy'))
    .addComponent(new ZombieAI(config.attackRange, config.attackDamage, config.attackCooldown, !!config.maneuver))
    .addComponent(new ScoreValue(config.score))
    .addComponent(new MeshRef(mesh));
}
