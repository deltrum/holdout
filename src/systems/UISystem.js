const MINE_COOLDOWN = 15;

export class UISystem {
  constructor() {
    this.playerHealthFill = document.getElementById('player-health-fill');
    this.baseHealthFill = document.getElementById('base-health-fill');
    this.waveCounter = document.getElementById('wave-counter');
    this.scoreDisplay = document.getElementById('score-display');
    this.ammoDisplay = document.getElementById('ammo-display');
    this.p2HealthFill = document.getElementById('p2-health-fill');
    this.p2AmmoDisplay = document.getElementById('p2-ammo-display');
    this.waveAnnouncement = document.getElementById('wave-announcement');
    this.waveNum = document.getElementById('wave-num');
    this.gameOverScreen = document.getElementById('game-over-screen');
    this.finalScore = document.getElementById('final-score');
    this.finalWave = document.getElementById('final-wave');
    this.hud = document.getElementById('hud');
    this.crosshair = document.getElementById('crosshair');
    this.damageOverlay = document.getElementById('damage-overlay');
    this.muteIndicator = document.getElementById('mute-indicator');
    this.p1MineCd = document.getElementById('p1-mine-cd');
    this.p2MineCd = document.getElementById('p2-mine-cd');
    this._announcementTimer = 0;
    this._damageFlashTimer = 0;
  }

  show() {
    this.hud.classList.remove('hidden');
    this.crosshair.style.display = 'block';
  }

  hide() {
    this.hud.classList.add('hidden');
    this.crosshair.style.display = 'none';
  }

  showWaveAnnouncement(wave) {
    this.waveNum.textContent = wave;
    this.waveAnnouncement.classList.remove('hidden');
    this.waveAnnouncement.classList.add('show');
    this._announcementTimer = 2.0;
  }

  flashDamage() {
    this._damageFlashTimer = 0.2;
    if (this.damageOverlay) {
      this.damageOverlay.style.opacity = '0.4';
    }
  }

  setMuted(muted) {
    if (this.muteIndicator) {
      this.muteIndicator.classList.toggle('hidden', !muted);
    }
  }

  update(dt, engine) {
    const { entityManager, waveSystem, gameState, inputSystem, combatSystem, elapsed } = engine;

    // Crosshair follows mouse
    if (inputSystem && this.crosshair) {
      this.crosshair.style.transform = `translate(${inputSystem.mouse.screenX - 11}px, ${inputSystem.mouse.screenY - 11}px)`;
    }

    // Player 1 health
    const p1 = entityManager.getEntitiesByTag('player1')[0];
    if (p1) {
      const health = p1.getComponent('Health');
      this.playerHealthFill.style.width = (health.ratio * 100) + '%';
      this.playerHealthFill.classList.toggle('low', health.ratio < 0.25);
      const shooter = p1.getComponent('Shooter');
      if (shooter) {
        const wpn = (shooter.weaponType || 'gun').toUpperCase();
        if (shooter.maxAmmo > 0) {
          this.ammoDisplay.textContent = shooter.reloading
            ? `${wpn} R${Math.floor((1 - shooter.reloadTimer / shooter.reloadTime) * 100)}%`
            : `${wpn} ${shooter.ammo}/${shooter.maxAmmo}`;
        } else {
          this.ammoDisplay.textContent = wpn;
        }
      } else {
        this.ammoDisplay.textContent = 'ZOMBIE';
      }
    }

    // Player 2 health
    const p2 = entityManager.getEntitiesByTag('player2')[0];
    if (p2 && this.p2HealthFill) {
      const health = p2.getComponent('Health');
      this.p2HealthFill.style.width = (health.ratio * 100) + '%';
      this.p2HealthFill.classList.toggle('low', health.ratio < 0.25);
      const shooter = p2.getComponent('Shooter');
      if (this.p2AmmoDisplay) {
        if (shooter) {
          const wpn = (shooter.weaponType || 'gun').toUpperCase();
          if (shooter.maxAmmo > 0) {
            this.p2AmmoDisplay.textContent = shooter.reloading
              ? `${wpn} R${Math.floor((1 - shooter.reloadTimer / shooter.reloadTime) * 100)}%`
              : `${wpn} ${shooter.ammo}/${shooter.maxAmmo}`;
          } else {
            this.p2AmmoDisplay.textContent = wpn;
          }
        } else {
          this.p2AmmoDisplay.textContent = 'ZOMBIE';
        }
      }
    }

    // Spawn cooldown indicator (only shown when player is a zombie)
    if (combatSystem && combatSystem._lastMinePlaced) {
      const p1IsZombie = p1 && p1.hasTag('playerzombie');
      const p2IsZombie = p2 && p2.hasTag('playerzombie');
      this._updateSpawnCd(this.p1MineCd, combatSystem._lastMinePlaced[1], elapsed, p1IsZombie);
      this._updateSpawnCd(this.p2MineCd, combatSystem._lastMinePlaced[2], elapsed, p2IsZombie);
    }

    // Base health
    const base = entityManager.getEntitiesByTag('base')[0];
    if (base) {
      const health = base.getComponent('Health');
      this.baseHealthFill.style.width = (health.ratio * 100) + '%';
      this.baseHealthFill.classList.toggle('low', health.ratio < 0.25);
    }

    // Wave and score
    this.waveCounter.textContent = `Wave: ${waveSystem.currentWave}`;
    this.scoreDisplay.textContent = `P1: ${gameState.score[1] || 0}  P2: ${gameState.score[2] || 0}`;

    // Wave announcement timer
    if (this._announcementTimer > 0) {
      this._announcementTimer -= dt;
      if (this._announcementTimer <= 0) {
        this.waveAnnouncement.classList.remove('show');
        setTimeout(() => this.waveAnnouncement.classList.add('hidden'), 400);
      }
    }

    // Damage flash fade
    if (this._damageFlashTimer > 0) {
      this._damageFlashTimer -= dt;
      if (this.damageOverlay) {
        const t = Math.max(0, this._damageFlashTimer / 0.2);
        this.damageOverlay.style.opacity = (t * 0.4).toString();
      }
    }

    // Game over
    if (gameState.gameOver && !gameState.gameOverShown) {
      gameState.gameOverShown = true;
      this.finalScore.textContent = `P1: ${gameState.score[1] || 0}  P2: ${gameState.score[2] || 0}`;
      this.finalWave.textContent = waveSystem.currentWave;
      this.gameOverScreen.classList.remove('hidden');
      this.crosshair.style.display = 'none';
      document.body.style.cursor = 'default';
    }
  }

  _updateSpawnCd(el, lastPlaced, elapsed, isZombie) {
    if (!el) return;
    if (!isZombie) {
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    const remaining = MINE_COOLDOWN - (elapsed - lastPlaced);
    if (remaining <= 0) {
      el.textContent = 'SPAWN';
      el.classList.remove('cooldown');
      el.classList.add('ready');
    } else {
      el.textContent = `SPAWN ${Math.ceil(remaining)}s`;
      el.classList.remove('ready');
      el.classList.add('cooldown');
    }
  }
}
