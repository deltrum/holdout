import * as THREE from 'three';
import { Transform } from '../components/Transform.js';
import { Velocity } from '../components/Velocity.js';
import { Health } from '../components/Health.js';
import { Collider } from '../components/Collider.js';
import { ZombieAI } from '../components/ZombieAI.js';
import { ScoreValue } from '../components/ScoreValue.js';
import { MeshRef } from '../components/MeshRef.js';
import { PlayerInput } from '../components/PlayerInput.js';
import { createZombieModel } from '../rendering/ZombieModel.js';

export function createPlayerZombie(entityManager, scene, playerIndex, spawnPos) {
  // Tinted zombie model based on player color
  const color = playerIndex === 1 ? 0x2266aa : 0xcc6622;
  const mesh = createZombieModel(color, 1.3);
  scene.add(mesh);

  return entityManager.createEntity()
    .addTag('zombie')
    .addTag('enemy')
    .addTag('playerzombie')
    .addTag('player' + playerIndex)
    .addComponent(new PlayerInput(playerIndex))
    .addComponent(new Transform(new THREE.Vector3(spawnPos.x, 0, spawnPos.z), 0))
    .addComponent(new Velocity(new THREE.Vector3(), 6))
    .addComponent(new Health(80, 80))
    .addComponent(new Collider(0.6, 'enemy'))
    .addComponent(new ZombieAI(1.5, 15, 0.8))
    .addComponent(new ScoreValue(0))
    .addComponent(new MeshRef(mesh));
}
