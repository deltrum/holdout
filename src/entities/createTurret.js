import * as THREE from 'three';
import { Transform } from '../components/Transform.js';
import { Health } from '../components/Health.js';
import { Collider } from '../components/Collider.js';
import { MeshRef } from '../components/MeshRef.js';
import { TurretAI } from '../components/TurretAI.js';
import { createTurretModel } from '../rendering/TurretModel.js';
import { createRocketTurretModel } from '../rendering/RocketTurretModel.js';
import { createFlameTurretModel } from '../rendering/FlameTurretModel.js';
import { createDualGunTurretModel } from '../rendering/DualGunTurretModel.js';
import { createMinigunTurretModel } from '../rendering/MinigunTurretModel.js';
import { createMortarTurretModel } from '../rendering/MortarTurretModel.js';
import { createLaserTurretModel } from '../rendering/LaserTurretModel.js';
import { createMegaTurretModel } from '../rendering/MegaTurretModel.js';

export function createTurret(entityManager, scene, position, weaponType = 'gun') {
  let mesh, ai;
  let maxHealth = 150;
  let colliderRadius = 0.6;

  if (weaponType === 'rocket') {
    mesh = createRocketTurretModel();
    ai = new TurretAI(18, 2.0, 15, 10, 'rocket');
  } else if (weaponType === 'flame') {
    mesh = createFlameTurretModel();
    ai = new TurretAI(8, 0.05, 5, 0, 'flame');
  } else if (weaponType === 'dualgun') {
    mesh = createDualGunTurretModel();
    ai = new TurretAI(14, 0.1, 8, 22, 'dualgun');
  } else if (weaponType === 'mortar') {
    mesh = createMortarTurretModel();
    // Long range, slow fire, fires burst of 3 rockets with flight time
    ai = new TurretAI(22, 4.0, 35, 0, 'mortar');
  } else if (weaponType === 'laser') {
    mesh = createLaserTurretModel();
    // Continuous beam, chains to nearby enemies. Tick damage, medium range.
    ai = new TurretAI(14, 0.08, 3, 0, 'laser');
  } else if (weaponType === 'minigun') {
    mesh = createMinigunTurretModel();
    // Insane fire rate, low per-bullet damage, long range
    ai = new TurretAI(16, 0.04, 3, 25, 'minigun');
  } else if (weaponType === 'mega') {
    mesh = createMegaTurretModel();
    // Primary: miniguns (fast, low damage, alternating left/right)
    ai = new TurretAI(20, 0.05, 4, 28, 'mega');
    // Secondary: homing rockets (slow, high damage, alternating pods)
    ai.secondaryFireRate = 1.2;
    ai.secondaryDamage = 18;
    // Slower to rotate (heavy) but thicker armor
    ai.turnSpeed = 3;
    maxHealth = 300;
    colliderRadius = 0.9;
  } else {
    mesh = createTurretModel();
    ai = new TurretAI(12, 0.2, 6, 18, 'gun');
  }

  scene.add(mesh);

  return entityManager.createEntity()
    .addTag('turret')
    .addComponent(new Transform(new THREE.Vector3(position.x, 0, position.z), 0))
    .addComponent(new Health(maxHealth, maxHealth))
    .addComponent(new Collider(colliderRadius, 'base', true))
    .addComponent(ai)
    .addComponent(new MeshRef(mesh));
}
