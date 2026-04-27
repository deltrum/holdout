import * as THREE from 'three';
import { Transform } from '../components/Transform.js';
import { Velocity } from '../components/Velocity.js';
import { Health } from '../components/Health.js';
import { Collider } from '../components/Collider.js';
import { Shooter } from '../components/Shooter.js';
import { MeshRef } from '../components/MeshRef.js';
import { PlayerInput } from '../components/PlayerInput.js';
import { createPlayerModel } from '../rendering/PlayerModel.js';
import { CONFIG } from '../config/gameConfig.js';

export function createPlayer(entityManager, scene, playerIndex = 1, spawnPos = null) {
  const mesh = createPlayerModel(playerIndex);
  scene.add(mesh);

  const defaultPos = playerIndex === 1
    ? new THREE.Vector3(-2, 0, 3)
    : new THREE.Vector3(2, 0, 3);
  const pos = spawnPos ? new THREE.Vector3(spawnPos.x, 0, spawnPos.z) : defaultPos;

  const { player, weapon } = CONFIG;
  return entityManager.createEntity()
    .addTag('player')
    .addTag('player' + playerIndex)
    .addComponent(new PlayerInput(playerIndex))
    .addComponent(new Transform(pos, 0))
    .addComponent(new Velocity(new THREE.Vector3(), player.speed))
    .addComponent(new Health(player.health, player.health))
    .addComponent(new Collider(player.colliderRadius, 'player'))
    .addComponent(new Shooter(weapon.fireRate, weapon.projectileSpeed, weapon.damage, weapon.maxAmmo, weapon.reloadTime))
    .addComponent(new MeshRef(mesh));
}
