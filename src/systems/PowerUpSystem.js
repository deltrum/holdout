import * as THREE from 'three';
import { POWERUP_TYPES } from '../components/PowerUp.js';
import { createPowerUp } from '../entities/createPowerUp.js';

const DROP_CHANCE = 0.25; // 25% chance per zombie kill
const POWERUP_KEYS = Object.keys(POWERUP_TYPES);

export class PowerUpSystem {
  constructor() {
    // Active effects per player: { type: expiresAt }
    this._activeEffects = { 1: {}, 2: {} };
    this._origStats = { 1: {}, 2: {} };
  }

  // Called by CombatSystem when a zombie dies
  trySpawnDrop(entityManager, scene, position) {
    if (Math.random() > DROP_CHANCE) return;
    const type = POWERUP_KEYS[Math.floor(Math.random() * POWERUP_KEYS.length)];
    createPowerUp(entityManager, scene, position, type);
  }

  update(dt, engine) {
    const { entityManager, audioSystem, particleSystem, elapsed } = engine;
    const powerups = entityManager.getEntitiesByTag('powerup');
    const players = entityManager.getEntitiesByTag('player');

    for (const pu of powerups) {
      if (!pu.alive) continue;
      const puComp = pu.getComponent('PowerUp');
      const transform = pu.getComponent('Transform');
      const meshRef = pu.getComponent('MeshRef');

      // Lifetime
      puComp.lifetime -= dt;
      if (puComp.lifetime <= 0) {
        pu.destroy();
        continue;
      }

      // Bobbing + rotation animation
      puComp.bobPhase += dt * 3;
      if (meshRef && meshRef.mesh) {
        meshRef.mesh.position.y = 1.0 + Math.sin(puComp.bobPhase) * 0.3;
        meshRef.mesh.rotation.y += dt * 2;

        // Blink when about to despawn
        if (puComp.lifetime < 3) {
          meshRef.mesh.visible = Math.sin(puComp.lifetime * 10) > 0;
        }
      }

      // Check pickup by any human player
      const config = POWERUP_TYPES[puComp.type];
      for (const player of players) {
        if (!player.alive || player.hasTag('playerzombie') || player.hasTag('npc')) continue;
        const pPos = player.getComponent('Transform').position;
        const dx = pPos.x - transform.position.x;
        const dz = pPos.z - transform.position.z;
        if (dx * dx + dz * dz < config.pickupRadius * config.pickupRadius) {
          this._applyEffect(player, puComp.type, engine);
          pu.destroy();

          // Pickup particles
          if (particleSystem) {
            particleSystem.emit(
              new THREE.Vector3(pPos.x, 1.5, pPos.z),
              new THREE.Vector3(0, 0, 0), 8, {
                speed: 4, speedVariance: 2, spread: 1.5,
                life: 0.3, lifeVariance: 0.1,
                size: 0.3, sizeVariance: 0.1,
                startColor: config.color, endColor: 0xffffff,
              });
          }
          break;
        }
      }
    }

    // Expire timed effects
    for (const idx of [1, 2]) {
      const effects = this._activeEffects[idx];
      for (const type in effects) {
        if (elapsed >= effects[type]) {
          this._removeEffect(entityManager, idx, type);
          delete effects[type];
        }
      }
    }
  }

  _applyEffect(player, type, engine) {
    const idx = player.getComponent('PlayerInput')?.playerIndex || 1;
    const health = player.getComponent('Health');
    const shooter = player.getComponent('Shooter');
    const velocity = player.getComponent('Velocity');
    const elapsed = engine.elapsed;

    switch (type) {
      case 'health':
        health.heal(40);
        break;

      case 'speed':
        if (!this._origStats[idx].speed) this._origStats[idx].speed = velocity.speed;
        velocity.speed = this._origStats[idx].speed * 1.6;
        this._activeEffects[idx].speed = elapsed + POWERUP_TYPES.speed.duration;
        break;

      case 'rapidfire':
        if (!shooter) break;
        if (!this._origStats[idx].fireRate) this._origStats[idx].fireRate = shooter.fireRate;
        shooter.fireRate = this._origStats[idx].fireRate * 0.3;
        this._activeEffects[idx].rapidfire = elapsed + POWERUP_TYPES.rapidfire.duration;
        break;

      case 'damage':
        if (!shooter) break;
        if (!this._origStats[idx].damage) this._origStats[idx].damage = shooter.damage;
        shooter.damage = this._origStats[idx].damage * 3;
        this._activeEffects[idx].damage = elapsed + POWERUP_TYPES.damage.duration;
        break;

      case 'shield':
        // Temporary invincibility — set health to max and flag
        health.current = health.max;
        if (!this._origStats[idx].shieldActive) this._origStats[idx].shieldActive = true;
        this._activeEffects[idx].shield = elapsed + POWERUP_TYPES.shield.duration;
        break;
    }

    engine.audioSystem.playWaveStart();
  }

  _removeEffect(entityManager, idx, type) {
    const player = entityManager.getEntitiesByTag('player' + idx)[0];
    if (!player || !player.alive || player.hasTag('playerzombie')) return;

    const velocity = player.getComponent('Velocity');
    const shooter = player.getComponent('Shooter');

    switch (type) {
      case 'speed':
        if (this._origStats[idx].speed) velocity.speed = this._origStats[idx].speed;
        this._origStats[idx].speed = null;
        break;
      case 'rapidfire':
        if (this._origStats[idx].fireRate) shooter.fireRate = this._origStats[idx].fireRate;
        this._origStats[idx].fireRate = null;
        break;
      case 'damage':
        if (this._origStats[idx].damage) shooter.damage = this._origStats[idx].damage;
        this._origStats[idx].damage = null;
        break;
      case 'shield':
        this._origStats[idx].shieldActive = false;
        break;
    }
  }

  reset() {
    this._activeEffects = { 1: {}, 2: {} };
    this._origStats = { 1: {}, 2: {} };
  }
}
