import { StateEncoder } from './StateEncoder.js';

const MOVE_VECTORS = [
  { x: 0, z: 0 },           // idle
  { x: 0, z: -1 },          // up
  { x: 0, z: 1 },           // down
  { x: -1, z: 0 },          // left
  { x: 1, z: 0 },           // right
  { x: -0.707, z: -0.707 }, // up-left
  { x: 0.707, z: -0.707 },  // up-right
  { x: -0.707, z: 0.707 },  // down-left
  { x: 0.707, z: 0.707 },   // down-right
];

export class AIController {
  constructor(engine) {
    this.engine = engine;
    this.agent = null;

    // InputSystem-compatible state
    this.mouseDown = false;
    this.mouseJustPressed = false;
    this.mutePressed = false;
    this._reloadPressed = false;
    this._movement = { x: 0, z: 0 };
    this._aimAngle = 0;
    this._nearestZombiePos = null;
    this.mouse = { x: 0, z: 0, screenX: 0, screenY: 0 };

    // Reward tracking
    this._prevPlayerHP = 100;
    this._prevBaseHP = 500;
    this._prevKills = 0;
    this._lastKillTime = 0;

    // State for training
    this.lastState = null;
    this.lastAction = 0;
  }

  setAgent(agent) {
    this.agent = agent;
  }

  resetEpisode() {
    this._prevPlayerHP = 100;
    this._prevBaseHP = 500;
    this._prevKills = 0;
    this._lastKillTime = 0;
    this.mouseDown = false;
    this._reloadPressed = false;
    this._movement = { x: 0, z: 0 };
  }

  encodeState(entityManager, waveSystem, gameState, elapsed) {
    const state = StateEncoder.encode(entityManager, waveSystem, gameState, elapsed);
    // Fill timeSinceLastKill
    state[54] = Math.min(1, (elapsed - this._lastKillTime) / 10.0);
    return state;
  }

  applyAction(actionIndex) {
    const moveIdx = Math.floor(actionIndex / 2);
    const shoot = actionIndex % 2 === 1;
    this._movement = MOVE_VECTORS[moveIdx];
    this.mouseDown = shoot;

    // Auto-reload heuristic
    const player = this.engine.entityManager.getEntitiesByTag('player')[0];
    if (player) {
      const shooter = player.getComponent('Shooter');
      const nearDist = this._getNearestZombieDist();
      this._reloadPressed = !shooter.reloading && (
        shooter.ammo <= 0 ||
        (shooter.ammo < 5 && nearDist > 8)
      );
    }

    // Update aim toward nearest zombie
    this._updateAim();
  }

  _updateAim() {
    const player = this.engine.entityManager.getEntitiesByTag('player')[0];
    if (!player) return;

    const px = player.getComponent('Transform').position.x;
    const pz = player.getComponent('Transform').position.z;
    const zombies = this.engine.entityManager.getEntitiesByTag('zombie');

    let closest = null;
    let closestDist = Infinity;
    for (const z of zombies) {
      const zt = z.getComponent('Transform').position;
      const dx = zt.x - px;
      const dz = zt.z - pz;
      const d = dx * dx + dz * dz;
      if (d < closestDist) {
        closestDist = d;
        closest = zt;
      }
    }

    if (closest) {
      this._aimAngle = Math.atan2(closest.x - px, closest.z - pz);
      this._nearestZombiePos = closest;
      this.mouse.x = closest.x;
      this.mouse.z = closest.z;
    }
  }

  _getNearestZombieDist() {
    const player = this.engine.entityManager.getEntitiesByTag('player')[0];
    if (!player) return Infinity;
    const px = player.getComponent('Transform').position.x;
    const pz = player.getComponent('Transform').position.z;
    let minDist = Infinity;
    for (const z of this.engine.entityManager.getEntitiesByTag('zombie')) {
      const zt = z.getComponent('Transform').position;
      const dx = zt.x - px;
      const dz = zt.z - pz;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  computeReward(gameState, entityManager, waveSystem) {
    let reward = 0.05; // survival bonus

    const player = entityManager.getEntitiesByTag('player')[0];
    const base = entityManager.getEntitiesByTag('base')[0];

    // Kill reward
    const killDelta = gameState.zombiesKilled - this._prevKills;
    if (killDelta > 0) {
      reward += killDelta * 10.0;
      this._lastKillTime = this.engine.elapsed;
    }
    this._prevKills = gameState.zombiesKilled;

    // Player damage penalty
    if (player) {
      const hp = player.getComponent('Health').current;
      const dmg = this._prevPlayerHP - hp;
      if (dmg > 0) reward -= 0.5 * (dmg / 100);
      this._prevPlayerHP = hp;
    }

    // Base damage penalty
    if (base && base.alive) {
      const hp = base.getComponent('Health').current;
      const dmg = this._prevBaseHP - hp;
      if (dmg > 0) reward -= 1.0 * (dmg / 500);
      this._prevBaseHP = hp;
    }

    // Terminal
    if (gameState.gameOver) {
      reward -= 10.0;
    }

    return Math.max(-15, Math.min(15, reward));
  }

  // --- InputSystem-compatible interface ---

  update() {
    // In AI play mode (not training), run the forward pass each frame
    if (this.engine.controlMode === 'ai' && this.agent) {
      const state = this.encodeState(
        this.engine.entityManager,
        this.engine.waveSystem,
        this.engine.gameState,
        this.engine.elapsed,
      );
      const action = this.agent.selectAction(state, 0); // epsilon=0 for play
      this.applyAction(action);
    }
  }

  postUpdate() {
    this._reloadPressed = false;
  }

  get reloadPressed() {
    return this._reloadPressed;
  }

  getMovementVector() {
    return this._movement;
  }

  getAimAngle(playerX, playerZ) {
    return this._aimAngle;
  }
}
