import { EntityManager } from './EntityManager.js';
import { RenderSystem } from '../systems/RenderSystem.js';
import { InputSystem } from '../systems/InputSystem.js';
import { MovementSystem } from '../systems/MovementSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { WaveSystem } from '../systems/WaveSystem.js';
import { UISystem } from '../systems/UISystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { PowerUpSystem } from '../systems/PowerUpSystem.js';
import { ParticleSystem } from '../rendering/ParticleSystem.js';
import { EnvironmentSystem } from '../systems/EnvironmentSystem.js';
import { ShopSystem } from '../systems/ShopSystem.js';
import { HelicopterSystem } from '../systems/HelicopterSystem.js';
import { GunshipSystem } from '../systems/GunshipSystem.js';

import { createPlayer } from '../entities/createPlayer.js';
import { createBase } from '../entities/createBase.js';
import { createTurret } from '../entities/createTurret.js';
import { createMine } from '../entities/createMine.js';
import { createNPCGroup } from '../entities/createNPC.js';

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.entityManager = new EntityManager();
    this.running = false;
    this.elapsed = 0;
    this._lastTime = 0;
    this._boundLoop = this._loop.bind(this);
    this._animFrameId = null;

    this.gameState = {
      score: { 1: 0, 2: 0 },
      gameOver: false,
      gameOverShown: false,
      gameOverReason: '',
      zombiesKilled: 0,
    };

    // Control mode: 'human' | 'ai' | 'training'
    this.controlMode = 'human';
    this.aiController = null;

    // Systems
    this.renderSystem = new RenderSystem(canvas);
    this.inputSystem = null;
    this.movementSystem = new MovementSystem();
    this.collisionSystem = new CollisionSystem();
    this.combatSystem = new CombatSystem();
    this.waveSystem = new WaveSystem();
    this.uiSystem = new UISystem();
    this.audioSystem = new AudioSystem();
    this.powerUpSystem = new PowerUpSystem();
    this.particleSystem = new ParticleSystem(this.renderSystem.scene);
    this.environmentSystem = new EnvironmentSystem(this.renderSystem.scene);
    this.shopSystem = new ShopSystem(this.renderSystem.scene);
    this.helicopterSystem = new HelicopterSystem(this.renderSystem.scene);
    this.gunshipSystem = new GunshipSystem(this.renderSystem.scene);
  }

  get activeInput() {
    return this.controlMode === 'human' ? this.inputSystem : this.aiController;
  }

  _spawnEntities() {
    const s = this.renderSystem.scene;
    const em = this.entityManager;
    createBase(em, s);
    createPlayer(em, s, 1);
    createPlayer(em, s, 2);
    createTurret(em, s, { x: 0, z: -3 }, 'gun');
    createTurret(em, s, { x: 0, z: 4 }, 'mega');
    // Mines in a ring around the base (radius ~8)
    const mineCount = 8;
    for (let i = 0; i < mineCount; i++) {
      const angle = (i / mineCount) * Math.PI * 2;
      const r = 8 + (i % 2) * 2; // alternate 8 and 10 radius
      createMine(em, s, { x: Math.cos(angle) * r, z: Math.sin(angle) * r });
    }
    // Survivors huddled on the map — helicopter evacuates them at game start
    createNPCGroup(em, s, { x: 12, z: -8 });
    this.helicopterSystem.reset();
    this.helicopterSystem.start();
    this.gunshipSystem.reset();

    // Environment
    this.environmentSystem.addEmergencyLight(-12, 0);
    this.environmentSystem.addEmergencyLight(12, 0);
    this.environmentSystem.addEmergencyLight(0, -14);
    this.environmentSystem.addEmergencyLight(0, 14);

    // Forest ring around the map — zombies spawn from the treeline
    this.environmentSystem.plantForest(16, 27, 90);
    this.waveSystem.treePositions = this.environmentSystem.treePositions;
  }

  init() {
    this.inputSystem = new InputSystem(
      this.canvas,
      this.renderSystem.camera,
      this.renderSystem.groundPlane,
    );

    this._spawnEntities();

    this.waveSystem.onWaveAnnouncement((wave) => {
      this.uiSystem.showWaveAnnouncement(wave);
      this.audioSystem.playWaveStart();
      // Gunship support flyby on wave 2
      if (wave === 2) this.gunshipSystem.spawn();
    });

    this.uiSystem.show();
    document.body.style.cursor = this.controlMode === 'human' ? 'none' : 'default';
  }

  start() {
    this.running = true;
    this._lastTime = performance.now();
    this._rAFActive = false;
    this.waveSystem.startFirstWave();

    this._animFrameId = requestAnimationFrame((ts) => {
      this._rAFActive = true;
      if (this._fallbackId) {
        clearInterval(this._fallbackId);
        this._fallbackId = null;
      }
      this._rAFLoop(ts);
    });

    this._fallbackId = setTimeout(() => {
      if (!this._rAFActive && this.running) {
        this._fallbackId = setInterval(() => {
          if (this.running) this._loop(performance.now());
        }, 1000 / 60);
      } else {
        this._fallbackId = null;
      }
    }, 100);
  }

  stop() {
    this.running = false;
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
    if (this._fallbackId) {
      clearInterval(this._fallbackId);
      clearTimeout(this._fallbackId);
      this._fallbackId = null;
    }
  }

  _rAFLoop(timestamp) {
    if (!this.running) return;
    this._loop(timestamp);
    this._animFrameId = requestAnimationFrame((ts) => this._rAFLoop(ts));
  }

  restart() {
    this.stop();
    this.entityManager.clear(this.renderSystem.scene);

    this.gameState = {
      score: { 1: 0, 2: 0 },
      gameOver: false,
      gameOverShown: false,
      gameOverReason: '',
      zombiesKilled: 0,
    };
    this.elapsed = 0;
    this.particleSystem.clear();
    this.powerUpSystem.reset();
    this.environmentSystem.clear();
    this.shopSystem.reset();
    this.helicopterSystem.reset();
    this.gunshipSystem.reset();

    this.waveSystem = new WaveSystem();
    this.waveSystem.onWaveAnnouncement((wave) => {
      this.uiSystem.showWaveAnnouncement(wave);
      this.audioSystem.playWaveStart();
      // Gunship support flyby on wave 2
      if (wave === 2) this.gunshipSystem.spawn();
    });

    this._spawnEntities();

    this.uiSystem.show();
    document.body.style.cursor = this.controlMode === 'human' ? 'none' : 'default';
    this.gameState.gameOverShown = false;

    this.start();
  }

  // Fast-forward step for training — skips render, particles, audio
  stepHeadless(dt) {
    this.elapsed += dt;
    const input = this.activeInput;

    this.waveSystem.update(dt, this.entityManager, this.renderSystem.scene, this.gameState);
    this.movementSystem.update(dt, this.entityManager, input);
    this.collisionSystem.update(dt, this.entityManager);
    this.combatSystem.update(dt, this);
    this.entityManager.cleanup(this.renderSystem.scene);
  }

  // Reset for training episodes — no UI transitions
  resetForTraining() {
    this.entityManager.clear(this.renderSystem.scene);
    this.particleSystem.clear();
    this.powerUpSystem.reset();
    this.environmentSystem.clear();
    this.shopSystem.reset();
    this.helicopterSystem.reset();
    this.gunshipSystem.reset();

    this.gameState = {
      score: { 1: 0, 2: 0 },
      gameOver: false,
      gameOverShown: false,
      gameOverReason: '',
      zombiesKilled: 0,
    };
    this.elapsed = 0;

    this.waveSystem = new WaveSystem();

    this._spawnEntities();

    this.waveSystem.startFirstWave();
  }

  _loop(timestamp) {
    if (!this.running) return;

    try {
      const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
      this._lastTime = timestamp;
      this.elapsed += dt;

      const input = this.activeInput;
      input.update();

      // Mute toggle (human only)
      if (this.controlMode === 'human' && this.inputSystem.mutePressed) {
        const muted = this.audioSystem.toggleMute();
        this.uiSystem.setMuted(muted);
      }

      this.waveSystem.update(dt, this.entityManager, this.renderSystem.scene, this.gameState);
      this.movementSystem.update(dt, this.entityManager, input);
      this.collisionSystem.update(dt, this.entityManager);
      this.combatSystem.update(dt, this);
      this.powerUpSystem.update(dt, this);
      this.particleSystem.update(dt);
      this.environmentSystem.update(dt, this.particleSystem);
      this.shopSystem.update(dt, this);
      this.helicopterSystem.update(dt, this);
      this.gunshipSystem.update(dt, this);

      this.renderSystem.update(dt, this.entityManager);
      this.uiSystem.update(dt, this);

      input.postUpdate();
    } catch (err) {
      console.error('Game loop error:', err);
    }
  }
}
