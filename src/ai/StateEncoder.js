import { TRAINING_CONFIG } from './trainingConfig.js';

const _stateBuffer = new Float32Array(TRAINING_CONFIG.stateSize);
const _zombieDistances = [];

export class StateEncoder {
  static encode(entityManager, waveSystem, gameState, elapsed) {
    _stateBuffer.fill(0);

    const player = entityManager.getEntitiesByTag('player')[0];
    const base = entityManager.getEntitiesByTag('base')[0];
    const zombies = entityManager.getEntitiesByTag('zombie');

    if (!player || !base) return _stateBuffer;

    const pTransform = player.getComponent('Transform');
    const pHealth = player.getComponent('Health');
    const pShooter = player.getComponent('Shooter');
    const bTransform = base.getComponent('Transform');
    const bHealth = base.getComponent('Health');

    const px = pTransform.position.x;
    const pz = pTransform.position.z;

    // Player state (0-5)
    _stateBuffer[0] = px / 30.0;
    _stateBuffer[1] = pz / 30.0;
    _stateBuffer[2] = pHealth.ratio;
    _stateBuffer[3] = pShooter.ammo / pShooter.maxAmmo;
    _stateBuffer[4] = pShooter.reloading ? 1 : 0;
    _stateBuffer[5] = pShooter.reloading ? (pShooter.reloadTimer / pShooter.reloadTime) : 0;

    // Base state (6-8)
    _stateBuffer[6] = bHealth.ratio;
    _stateBuffer[7] = bTransform.position.x / 30.0;
    _stateBuffer[8] = bTransform.position.z / 30.0;

    // Game state (9-11)
    _stateBuffer[9] = Math.min(1, waveSystem.currentWave / 20.0);
    _stateBuffer[10] = Math.min(1, zombies.length / 30.0);

    const canShoot = pShooter.ammo > 0 && !pShooter.reloading &&
      (elapsed - pShooter.lastFired >= pShooter.fireRate);
    _stateBuffer[11] = canShoot ? 1 : 0;

    // 8 nearest zombies (12-51), 5 floats each
    _zombieDistances.length = 0;
    for (const z of zombies) {
      const zt = z.getComponent('Transform');
      const dx = zt.position.x - px;
      const dz = zt.position.z - pz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      _zombieDistances.push({ entity: z, dx, dz, dist });
    }
    _zombieDistances.sort((a, b) => a.dist - b.dist);

    const maxZ = Math.min(8, _zombieDistances.length);
    for (let i = 0; i < maxZ; i++) {
      const zd = _zombieDistances[i];
      const zh = zd.entity.getComponent('Health');
      const zv = zd.entity.getComponent('Velocity');
      const base_idx = 12 + i * 5;
      _stateBuffer[base_idx] = zd.dx / 30.0;
      _stateBuffer[base_idx + 1] = zd.dz / 30.0;
      _stateBuffer[base_idx + 2] = zd.dist / 30.0;
      _stateBuffer[base_idx + 3] = zh.ratio;
      _stateBuffer[base_idx + 4] = zv.speed / 5.0;
    }

    // Distance and angle to base (52-53)
    const dbx = bTransform.position.x - px;
    const dbz = bTransform.position.z - pz;
    _stateBuffer[52] = Math.sqrt(dbx * dbx + dbz * dbz) / 30.0;
    _stateBuffer[53] = Math.atan2(dbx, dbz) / Math.PI;

    // Time since last kill (54)
    _stateBuffer[54] = 0; // Managed by AIController

    return _stateBuffer;
  }
}
