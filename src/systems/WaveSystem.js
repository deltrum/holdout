import { createZombie } from '../entities/createZombie.js';
import { ZOMBIE_TYPES } from '../config/zombieTypes.js';
import { CONFIG } from '../config/gameConfig.js';
import { randomPointOnCircle } from '../utils/math.js';

export class WaveSystem {
  constructor() {
    this.currentWave = 0;
    this.enemiesRemaining = 0;
    this.state = 'idle'; // 'idle' | 'countdown' | 'active' | 'intermission'
    this.timer = 0;
    this.spawnQueue = [];
    this.treePositions = []; // set by GameEngine from EnvironmentSystem
    this.spawnTimer = 0;
    this._announcementCallback = null;
  }

  onWaveAnnouncement(callback) {
    this._announcementCallback = callback;
  }

  startFirstWave() {
    this.state = 'countdown';
    this.timer = 3;
    this.currentWave = 1;
  }

  update(dt, entityManager, scene, gameState) {
    if (gameState.gameOver) return;

    switch (this.state) {
      case 'idle':
        break;

      case 'countdown':
        this.timer -= dt;
        if (this.timer <= 0) {
          this._startWave(entityManager, scene);
        }
        break;

      case 'active':
        this._processSpawnQueue(dt, entityManager, scene);
        // Count alive AI zombies (exclude player-controlled zombies)
        const aliveZombies = entityManager.getEntitiesByTag('zombie')
          .filter(z => !z.hasTag('playerzombie')).length;
        if (aliveZombies === 0 && this.spawnQueue.length === 0) {
          this.state = 'intermission';
          this.timer = CONFIG.wave.intermissionTime;
        }
        break;

      case 'intermission':
        this.timer -= dt;
        if (this.timer <= 0) {
          this.currentWave++;
          this.state = 'countdown';
          this.timer = 3;
        }
        break;
    }
  }

  _startWave(entityManager, scene) {
    if (this._announcementCallback) {
      this._announcementCallback(this.currentWave);
    }

    this.spawnQueue = this._generateWaveSpawns(this.currentWave);
    this.enemiesRemaining = this.spawnQueue.length;
    this.spawnTimer = 0;
    this.state = 'active';
  }

  _generateWaveSpawns(wave) {
    const { baseEnemyCount, enemyCountGrowth, quadraticGrowth, baseSpawnInterval, spawnIntervalShrink } = CONFIG.wave;
    const total = Math.floor(baseEnemyCount + wave * enemyCountGrowth + wave * wave * quadraticGrowth);
    const spawns = [];

    const interval = Math.max(0.2, baseSpawnInterval - wave * spawnIntervalShrink);

    for (let i = 0; i < total; i++) {
      spawns.push({
        type: this._pickZombieType(wave),
        delay: i * interval,
      });
    }

    // Every 2nd wave: add a pack of runners
    if (wave >= 2 && wave % 2 === 0) {
      const runnerCount = Math.floor(2 + wave * 0.5);
      const runnerDelay = total * interval + 0.5; // spawn after main wave with a brief gap
      for (let i = 0; i < runnerCount; i++) {
        spawns.push({
          type: 'runner',
          delay: runnerDelay + i * 0.3, // rapid burst spawn
        });
      }
    }

    return spawns;
  }

  _pickZombieType(wave) {
    const available = Object.entries(ZOMBIE_TYPES).filter(([, cfg]) => wave >= cfg.minWave);
    if (available.length === 0) return 'basic';

    // Weighted random - newer types are rarer
    const weights = available.map(([name, cfg]) => {
      const wavesSinceUnlock = wave - cfg.minWave;
      return Math.max(1, 5 - wavesSinceUnlock * 0.3);
    });

    // Invert so newer types get lower weight initially
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;

    for (let i = 0; i < available.length; i++) {
      r -= weights[i];
      if (r <= 0) return available[i][0];
    }

    return available[available.length - 1][0];
  }

  _processSpawnQueue(dt, entityManager, scene) {
    this.spawnTimer += dt;

    while (this.spawnQueue.length > 0 && this.spawnTimer >= this.spawnQueue[0].delay) {
      const spawn = this.spawnQueue.shift();
      let spawnPos;

      // 80% chance to spawn near a tree cluster, 20% random circle
      if (this.treePositions.length > 0 && Math.random() < 0.8) {
        const tree = this.treePositions[Math.floor(Math.random() * this.treePositions.length)];
        spawnPos = { x: tree.x + (Math.random() - 0.5) * 3, z: tree.z + (Math.random() - 0.5) * 3 };
      } else {
        spawnPos = randomPointOnCircle(CONFIG.wave.spawnRadius);
      }

      const targetPos = { x: 0, z: 0 };
      createZombie(entityManager, scene, spawn.type, spawnPos, targetPos);
    }
  }
}
