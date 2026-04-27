import * as THREE from 'three';
import { createProjectile } from '../entities/createProjectile.js';
import { createRocket } from '../entities/createRocket.js';
import { createZombie } from '../entities/createZombie.js';
import { createPlayerZombie } from '../entities/createPlayerZombie.js';
import { createBarricade } from '../entities/createBarricade.js';
import { Owner } from '../components/Owner.js';
import { MortarStrike } from '../components/MortarStrike.js';
import { WEAPON_TYPES } from '../config/weaponTypes.js';

const BARRICADE_COST = 60;
const MINE_COOLDOWN = 15; // used for player-zombie spawn ability

export class CombatSystem {
  constructor() {
    this._reloadSoundPlayed = false;
    this._lastMinePlaced = { 1: -Infinity, 2: -Infinity };
    this._laserBeams = []; // active beam line visuals
  }

  update(dt, engine) {
    const { entityManager, collisionSystem, renderSystem, elapsed, gameState, audioSystem, particleSystem } = engine;
    const inputSystem = engine.activeInput;
    if (gameState.gameOver) return;

    const players = entityManager.getEntitiesByTag('player');
    if (players.length === 0) return;

    // Process each player's shooting independently (skip player-zombies)
    for (const player of players) {
      if (player.hasTag('playerzombie')) continue;
      const pInput = player.getComponent('PlayerInput');
      const idx = pInput ? pInput.playerIndex : 1;
      const playerTransform = player.getComponent('Transform');
      const shooter = player.getComponent('Shooter');
      if (!shooter) continue;

      const isShooting = inputSystem.getShootForPlayer
        ? inputSystem.getShootForPlayer(idx)
        : inputSystem.mouseDown;
      const isReload = inputSystem.getReloadForPlayer
        ? inputSystem.getReloadForPlayer(idx)
        : inputSystem.reloadPressed;

      // Weapon switching (Q/E)
      const wpnSwitch = inputSystem.getWeaponSwitchForPlayer
        ? inputSystem.getWeaponSwitchForPlayer(idx)
        : 0;
      if (wpnSwitch !== 0 && shooter.ownedWeapons.length > 1) {
        const curIdx = shooter.ownedWeapons.indexOf(shooter.weaponType);
        const newIdx = (curIdx + wpnSwitch + shooter.ownedWeapons.length) % shooter.ownedWeapons.length;
        const newType = shooter.ownedWeapons[newIdx];
        shooter.switchWeapon(newType, WEAPON_TYPES[newType]);
      }

      const wpnConfig = WEAPON_TYPES[shooter.weaponType] || WEAPON_TYPES.gun;

      // Reload logic (ammo weapons only)
      if (wpnConfig.usesAmmo) {
        if (shooter.reloading) {
          shooter.reloadTimer -= dt;
          if (shooter.reloadTimer <= 0) {
            shooter.ammo = shooter.maxAmmo;
            shooter.reloading = false;
          }
        }
        if (isReload && !shooter.reloading && shooter.ammo < shooter.maxAmmo) {
          shooter.reloading = true;
          shooter.reloadTimer = shooter.reloadTime;
        }
      }

      // Common: muzzle position + aim direction
      const rot = playerTransform.rotation;
      const sinR = Math.sin(rot);
      const cosR = Math.cos(rot);
      const localX = 0.4;
      const localZ = 0.65;
      const muzzleX = playerTransform.position.x + localX * cosR + localZ * sinR;
      const muzzleZ = playerTransform.position.z - localX * sinR + localZ * cosR;
      const muzzle = new THREE.Vector3(muzzleX, 0.85, muzzleZ);

      let dir;
      const pMouse = inputSystem.getMouseForPlayer
        ? inputSystem.getMouseForPlayer(idx)
        : (inputSystem.mouse || null);
      if (pMouse) {
        const dx = pMouse.x - muzzleX;
        const dz = pMouse.z - muzzleZ;
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        dir = new THREE.Vector3(dx / len, 0, dz / len);
      } else {
        dir = new THREE.Vector3(sinR, 0, cosR);
      }

      // Fire check
      const canShoot = wpnConfig.usesAmmo
        ? (isShooting && !shooter.reloading && shooter.ammo > 0 && elapsed - shooter.lastFired >= shooter.fireRate)
        : (isShooting && elapsed - shooter.lastFired >= shooter.fireRate);

      if (canShoot) {
        shooter.lastFired = elapsed;
        if (wpnConfig.usesAmmo) {
          shooter.ammo--;
          if (shooter.ammo <= 0) {
            shooter.reloading = true;
            shooter.reloadTimer = shooter.reloadTime;
          }
        }

        if (shooter.weaponType === 'flame') {
          // --- Flamethrower: cone damage (reuse turret flame logic) ---
          const range = wpnConfig.range;
          const zombies = entityManager.getEntitiesByTag('zombie');
          for (const zombie of zombies) {
            if (!zombie.alive) continue;
            const zPos = zombie.getComponent('Transform').position;
            const dx = zPos.x - playerTransform.position.x;
            const dz = zPos.z - playerTransform.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > range) continue;
            const nx = dx / (dist || 1);
            const nz = dz / (dist || 1);
            const dot = nx * dir.x + nz * dir.z;
            if (dot < wpnConfig.cone) continue;

            const hp = zombie.getComponent('Health');
            const dead = hp.takeDamage(shooter.damage);
            if (dead) {
              const score = zombie.getComponent('ScoreValue');
              if (score) gameState.score[idx] += score.points;
              if (engine.powerUpSystem) engine.powerUpSystem.trySpawnDrop(entityManager, renderSystem.scene, { x: zPos.x, z: zPos.z });
              zombie.destroy();
              gameState.zombiesKilled++;
            }
          }

          // Fire particles (same layered cone as turret)
          particleSystem.emit(muzzle, dir, 4, {
            speed: 12, speedVariance: 3, spread: 0.3,
            life: 0.15, lifeVariance: 0.04,
            size: 0.5, sizeVariance: 0.1,
            startColor: 0xffffaa, endColor: 0xff8800,
          });
          const mid = new THREE.Vector3(muzzle.x + dir.x * range * 0.4, muzzle.y, muzzle.z + dir.z * range * 0.4);
          particleSystem.emit(mid, dir, 5, {
            speed: 8, speedVariance: 4, spread: 0.8,
            life: 0.25, lifeVariance: 0.08,
            size: 0.7, sizeVariance: 0.2,
            startColor: 0xff6600, endColor: 0xcc2200,
          });
          const far = new THREE.Vector3(muzzle.x + dir.x * range * 0.7, muzzle.y, muzzle.z + dir.z * range * 0.7);
          particleSystem.emit(far, dir, 3, {
            speed: 5, speedVariance: 3, spread: 1.2,
            life: 0.3, lifeVariance: 0.1,
            size: 0.9, sizeVariance: 0.3,
            startColor: 0xdd4400, endColor: 0x331100,
          });
          particleSystem.emitFlash(muzzle, 0xff8833, 3, 0.06);
          particleSystem.emitFlash(mid, 0xff6600, 2, 0.06);

        } else {
          // --- Default gun: projectile ---
          const proj = createProjectile(entityManager, renderSystem.scene, muzzle, dir, shooter.projectileSpeed, shooter.damage);
          proj.addComponent(new Owner(idx));

          audioSystem.playGunshot();
          particleSystem.emit(muzzle, dir, 5, {
            speed: 8, speedVariance: 3, spread: 0.25, life: 0.1, lifeVariance: 0.03,
            size: 0.25, sizeVariance: 0.08, startColor: 0xffff44, endColor: 0xff6600,
          });
          particleSystem.emit(muzzle, dir, 3, {
            speed: 10, speedVariance: 4, spread: 0.6, life: 0.08, lifeVariance: 0.03,
            size: 0.15, sizeVariance: 0.05, startColor: 0xffffcc, endColor: 0xffaa00,
          });
          particleSystem.emitFlash(muzzle, 0xffee44, 3, 0.06);
        }
      }
    }

    // Player-zombie spawn ability: triggered by barricade key (B) on 15s cooldown
    const playerZombies = entityManager.getEntitiesByTag('playerzombie');
    for (const pz of playerZombies) {
      const pInput = pz.getComponent('PlayerInput');
      if (!pInput) continue;
      const idx = pInput.playerIndex;
      const wantsAbility = inputSystem.getBarricadePlaceForPlayer
        ? inputSystem.getBarricadePlaceForPlayer(idx)
        : false;
      if (!wantsAbility) continue;
      if (elapsed - this._lastMinePlaced[idx] < MINE_COOLDOWN) continue;

      this._lastMinePlaced[idx] = elapsed;
      const pos = pz.getComponent('Transform').position;
      const wave = engine.waveSystem.currentWave;
      const count = Math.min(wave, 10);
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const r = 2 + Math.random();
        const sx = pos.x + Math.cos(angle) * r;
        const sz = pos.z + Math.sin(angle) * r;
        createZombie(entityManager, renderSystem.scene, 'basic',
          { x: sx, z: sz }, { x: 0, z: 0 });
      }
      audioSystem.playWaveStart();
      if (engine.particleSystem) {
        engine.particleSystem.emit(
          new THREE.Vector3(pos.x, 1, pos.z),
          new THREE.Vector3(0, 0, 0), 12, {
            speed: 6, speedVariance: 3, spread: 2.0,
            life: 0.4, lifeVariance: 0.1,
            size: 0.4, sizeVariance: 0.1,
            startColor: 0x44aa33, endColor: 0x112200,
          });
        engine.particleSystem.emitFlash(
          new THREE.Vector3(pos.x, 2, pos.z), 0x44ff44, 4, 0.15);
      }
    }

    // Barricade placement (human players only, no cooldown, costs 60 pts)
    for (const player of players) {
      if (player.hasTag('playerzombie')) continue;
      const pInput = player.getComponent('PlayerInput');
      if (!pInput) continue;
      const idx = pInput.playerIndex;
      const wantsBarricade = inputSystem.getBarricadePlaceForPlayer
        ? inputSystem.getBarricadePlaceForPlayer(idx)
        : false;
      if (wantsBarricade && (gameState.score[idx] || 0) >= BARRICADE_COST) {
        gameState.score[idx] -= BARRICADE_COST;
        const pos = player.getComponent('Transform').position;
        const rot = player.getComponent('Transform').rotation;
        // Place slightly in front of player
        const bx = pos.x + Math.sin(rot) * 1.5;
        const bz = pos.z + Math.cos(rot) * 1.5;
        createBarricade(entityManager, renderSystem.scene, { x: bx, z: bz });
        audioSystem.playReload();
      }
    }

    // Clean up previous frame's laser beams
    for (const beam of this._laserBeams) {
      renderSystem.scene.remove(beam);
      beam.geometry.dispose();
      beam.material.dispose();
    }
    this._laserBeams.length = 0;

    // Turret AI
    this._processTurrets(engine, dt);

    // Mortar strikes countdown
    this._processMortarStrikes(dt, engine);

    // Homing rocket trails
    this._processHomingTrails(dt, engine);

    // Process collisions
    for (const { a, b } of collisionSystem.collisionPairs) {
      this._processCollision(a, b, engine);
    }

    // Mine proximity check
    this._processMines(engine);

    // Zombie attack processing
    this._processZombieAttacks(dt, engine);
  }

  _processCollision(a, b, engine) {
    const { entityManager, gameState, audioSystem, particleSystem } = engine;

    let projectile = null;
    let enemy = null;

    if (a.hasTag('projectile')) projectile = a;
    if (b.hasTag('projectile')) projectile = b;
    if (a.hasTag('enemy')) enemy = a;
    if (b.hasTag('enemy')) enemy = b;

    // Projectile hits enemy
    if (projectile && enemy) {
      const damage = projectile.getComponent('Damage');
      const health = enemy.getComponent('Health');
      const dead = health.takeDamage(damage.value);
      const hitPos = enemy.getComponent('Transform').position.clone();
      hitPos.y = 0.9;

      projectile.destroy();

      // Rocket explosion — AoE damage to nearby enemies
      const rocket = projectile.getComponent('Rocket');
      if (rocket) {
        this._explodeRocket(hitPos, rocket, engine);
      }

      if (dead) {
        const score = enemy.getComponent('ScoreValue');
        if (score) {
          const owner = projectile.getComponent('Owner');
          const ownIdx = owner ? owner.playerIndex : 0;
          if (ownIdx > 0) gameState.score[ownIdx] += score.points;
          else { gameState.score[1] += Math.ceil(score.points / 2); gameState.score[2] += Math.floor(score.points / 2); }
        }
        enemy.destroy();
        gameState.zombiesKilled++;


        // Power-up drop chance
        if (engine.powerUpSystem) {
          engine.powerUpSystem.trySpawnDrop(entityManager, engine.renderSystem.scene, hitPos);
        }

        // Death burst: big particle explosion outward on XZ
        audioSystem.playZombieDeath();
        const outDir = new THREE.Vector3(0, 0, 0);
        particleSystem.emit(hitPos, outDir, 14, {
          speed: 8,
          speedVariance: 5,
          spread: 2.0,
          life: 0.45,
          lifeVariance: 0.15,
          size: 0.5,
          sizeVariance: 0.15,
          startColor: 0x66aa55,
          endColor: 0x112200,
          ySpeed: 1,
        });
        particleSystem.emitFlash(hitPos, 0x88ff66, 3, 0.12);
      } else {
        // Hit particles: smaller spray on XZ
        audioSystem.playZombieHit();
        const outDir = new THREE.Vector3(0, 0, 0);
        particleSystem.emit(hitPos, outDir, 5, {
          speed: 5,
          speedVariance: 3,
          spread: 1.5,
          life: 0.2,
          lifeVariance: 0.05,
          size: 0.35,
          sizeVariance: 0.1,
          startColor: 0x55aa44,
          endColor: 0x223300,
        });

        // Flash enemy red
        const meshRef = enemy.getComponent('MeshRef');
        if (meshRef && meshRef.mesh) {
          this._flashEntity(meshRef.mesh);
        }
      }
    }
  }

  _processZombieAttacks(dt, engine) {
    const { entityManager, elapsed, gameState, audioSystem } = engine;
    const uiSystem = engine.uiSystem;
    const base = entityManager.getEntitiesByTag('base')[0];
    const players = entityManager.getEntitiesByTag('player');

    for (const zombie of entityManager.getEntitiesByTag('zombie')) {
      const ai = zombie.getComponent('ZombieAI');
      if (ai.state !== 'attacking') continue;
      if (elapsed - ai.lastAttack < ai.attackCooldown) continue;

      ai.lastAttack = elapsed;
      const zombiePos = zombie.getComponent('Transform').position;

      let attacked = false;

      // Attack closest alive human player in range (skip other player-zombies)
      const isPlayerZombie = zombie.hasTag('playerzombie');
      const zombieOwner = zombie.getComponent('PlayerInput')?.playerIndex || 0;

      for (const player of players) {
        if (!player.alive) continue;
        if (player.hasTag('playerzombie')) continue; // zombies don't attack player-zombies
        if (isPlayerZombie && player.getComponent('PlayerInput')?.playerIndex === zombieOwner) continue;
        const playerPos = player.getComponent('Transform').position;
        const dist = zombiePos.distanceTo(playerPos);
        if (dist <= ai.attackRange + 0.3) {
          const health = player.getComponent('Health');
          health.takeDamage(ai.attackDamage);
          audioSystem.playDamage();
          uiSystem.flashDamage();

          // Player/NPC died
          if (health.current <= 0) {
            const deadPos = player.getComponent('Transform').position;
            const pInput = player.getComponent('PlayerInput');

            // NPCs just die
            if (!pInput) {
              player.destroy();
              attacked = true;
              break;
            }

            // Real player — become a player-controlled zombie
            const deadIdx = pInput.playerIndex;
            player.destroy();

            // Spawn a zombie the dead player controls
            const scene = engine.renderSystem.scene;
            createPlayerZombie(entityManager, scene, deadIdx,
              { x: deadPos.x, z: deadPos.z },
            );

            audioSystem.playZombieDeath();
            if (engine.particleSystem) {
              const outDir = new THREE.Vector3(0, 0, 0);
              engine.particleSystem.emit(
                new THREE.Vector3(deadPos.x, 1, deadPos.z), outDir, 16, {
                  speed: 7, speedVariance: 4, spread: 2.0,
                  life: 0.5, lifeVariance: 0.15,
                  size: 0.5, sizeVariance: 0.15,
                  startColor: 0x44aa33, endColor: 0x112200,
                },
              );
            }

            // Check if ALL original players are dead (no player tags without playerzombie)
            const livingPlayers = players.filter(p =>
              p.alive && p.getComponent('Health').current > 0 && !p.hasTag('playerzombie') && !p.hasTag('npc'),
            );
            const allDead = livingPlayers.length === 0;
            if (allDead) {
              gameState.gameOver = true;
              gameState.gameOverReason = 'player';
              audioSystem.playGameOver();
            }
          }
          attacked = true;
          break;
        }
      }

      if (!attacked && base && base.alive) {
        const basePos = base.getComponent('Transform').position;
        const dist = zombiePos.distanceTo(basePos);
        if (dist <= ai.attackRange + 1.5) {
          const health = base.getComponent('Health');
          const dead = health.takeDamage(ai.attackDamage);
          audioSystem.playDamage();
          uiSystem.flashDamage();
          if (dead) {
            gameState.gameOver = true;
            gameState.gameOverReason = 'base';
            base.destroy();
            audioSystem.playGameOver();
          }
          attacked = true;
        }
      }

      // Attack barricades
      if (!attacked) {
        for (const barr of entityManager.getEntitiesByTag('barricade')) {
          if (!barr.alive) continue;
          const bp = barr.getComponent('Transform').position;
          const dist = zombiePos.distanceTo(bp);
          if (dist <= ai.attackRange + 0.8) {
            const bh = barr.getComponent('Health');
            const dead = bh.takeDamage(ai.attackDamage);
            if (dead) barr.destroy();
            else {
              const bm = barr.getComponent('MeshRef');
              if (bm && bm.mesh) this._flashEntity(bm.mesh);
            }
            attacked = true;
            break;
          }
        }
      }

      // Attack turrets
      if (!attacked) {
        for (const t of entityManager.getEntitiesByTag('turret')) {
          if (!t.alive || t.hasTag('npc')) continue;
          const tp = t.getComponent('Transform').position;
          const dist = zombiePos.distanceTo(tp);
          if (dist <= ai.attackRange + 0.8) {
            const th = t.getComponent('Health');
            const dead = th.takeDamage(ai.attackDamage);
            if (dead) t.destroy();
            else {
              const tm = t.getComponent('MeshRef');
              if (tm && tm.mesh) this._flashEntity(tm.mesh);
            }
            attacked = true;
            break;
          }
        }
      }

      if (!attacked) {
        ai.state = 'moving';
        const velocity = zombie.getComponent('Velocity');
        velocity.speed = zombie.getComponent('Health').max > 50 ? 1.2 : 2.5;
      }
    }
  }

  _processTurrets(engine, dt) {
    const { entityManager, elapsed, gameState, audioSystem, particleSystem } = engine;
    const scene = engine.renderSystem.scene;
    const turrets = entityManager.getEntitiesByTag('turret');
    if (turrets.length === 0) return;

    const zombies = entityManager.getEntitiesByTag('zombie');
    if (zombies.length === 0) return;

    for (const turret of turrets) {
      const turretAI = turret.getComponent('TurretAI');
      const turretTransform = turret.getComponent('Transform');
      const turretPos = turretTransform.position;

      // Find closest zombie in range
      let closestDist = Infinity;
      let closestZombie = null;

      for (const zombie of zombies) {
        const zPos = zombie.getComponent('Transform').position;
        const dx = zPos.x - turretPos.x;
        const dz = zPos.z - turretPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= turretAI.range && dist < closestDist) {
          closestDist = dist;
          closestZombie = zombie;
        }
      }

      if (!closestZombie) continue;

      // Calculate desired angle toward target
      const targetPos = closestZombie.getComponent('Transform').position;
      const desiredAngle = Math.atan2(
        targetPos.x - turretPos.x,
        targetPos.z - turretPos.z,
      );

      // Smooth rotation: lerp currentAngle toward desiredAngle
      let diff = desiredAngle - turretAI.currentAngle;
      // Wrap to [-PI, PI]
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const maxTurn = turretAI.turnSpeed * dt;
      if (Math.abs(diff) <= maxTurn) {
        turretAI.currentAngle = desiredAngle;
      } else {
        turretAI.currentAngle += Math.sign(diff) * maxTurn;
      }
      // Wrap currentAngle
      if (turretAI.currentAngle > Math.PI) turretAI.currentAngle -= Math.PI * 2;
      if (turretAI.currentAngle < -Math.PI) turretAI.currentAngle += Math.PI * 2;

      const angle = turretAI.currentAngle;
      const aimed = Math.abs(diff) < 0.15; // ~8.5 degrees tolerance

      const meshRef = turret.getComponent('MeshRef');
      if (meshRef && meshRef.mesh) {
        const head = meshRef.mesh.getObjectByName('turretHead');
        if (head) {
          head.rotation.y = angle;
        } else {
          turret.getComponent('Transform').rotation = angle;
        }
      }

      // Only fire when aimed close enough to target
      if (!aimed) continue;

      // Fire if cooldown elapsed (laser always draws beam, only damages on tick)
      const canFire = elapsed - turretAI.lastFired >= turretAI.fireRate;
      if (canFire) turretAI.lastFired = elapsed;
      if (!canFire && turretAI.weaponType !== 'laser') continue;

      // Spawn projectile from turret barrel
      const dir = new THREE.Vector3(
        Math.sin(angle),
        0,
        Math.cos(angle),
      );
      const origin = turretPos.clone();
      origin.y = 1.25;
      origin.x += dir.x * 1.2;
      origin.z += dir.z * 1.2;

      if (turretAI.weaponType === 'mortar') {
        // Fire burst of 3 rockets toward target area with flight delay
        const targetPos = closestZombie.getComponent('Transform').position;
        const burstCount = 3;
        for (let i = 0; i < burstCount; i++) {
          const offsetX = (Math.random() - 0.5) * 3;
          const offsetZ = (Math.random() - 0.5) * 3;
          const tx = targetPos.x + offsetX;
          const tz = targetPos.z + offsetZ;
          const flightTime = 1.5 + Math.random() * 0.5;

          // Warning ring — subtle, more transparent
          const warningGeo = new THREE.RingGeometry(0.2, 3.5, 24);
          warningGeo.rotateX(-Math.PI / 2);
          const warningMat = new THREE.MeshBasicMaterial({
            color: 0xff2200, transparent: true, opacity: 0.1,
            depthWrite: false, fog: false, side: THREE.DoubleSide,
          });
          const warningMesh = new THREE.Mesh(warningGeo, warningMat);
          warningMesh.position.set(tx, 0.04, tz);
          scene.add(warningMesh);

          const strike = entityManager.createEntity()
            .addTag('mortarStrike')
            .addComponent(new MortarStrike(tx, tz, flightTime, turretAI.damage, 3.5));
          strike.getComponent('MortarStrike').warningMesh = warningMesh;
        }

        // Big launch effect — rockets streaking upward
        const upDir = new THREE.Vector3(0, 0, 0);

        // Fire blast from tubes
        particleSystem.emit(origin, dir, 8, {
          speed: 12, speedVariance: 4, spread: 0.3,
          life: 0.2, lifeVariance: 0.06,
          size: 0.5, sizeVariance: 0.15,
          startColor: 0xffaa22, endColor: 0xff4400,
          ySpeed: 8,
        });

        // Upward smoke plume
        particleSystem.emit(origin, upDir, 10, {
          speed: 3, speedVariance: 2, spread: 0.6,
          life: 0.6, lifeVariance: 0.2,
          size: 0.6, sizeVariance: 0.2,
          startColor: 0x999999, endColor: 0x222222,
          ySpeed: 5,
        });

        // Bright sparks shooting out
        particleSystem.emit(origin, dir, 6, {
          speed: 15, speedVariance: 5, spread: 0.8,
          life: 0.12, lifeVariance: 0.04,
          size: 0.2, sizeVariance: 0.06,
          startColor: 0xffffaa, endColor: 0xff6600,
          ySpeed: 6,
        });

        // Big flash
        particleSystem.emitFlash(origin, 0xff8833, 6, 0.15);
        audioSystem.playGunshot();
      } else if (turretAI.weaponType === 'laser') {
        // Chain lightning beam — hits primary target then chains to nearby enemies
        const maxChains = 3;
        const chainRange = 5;
        const hit = [closestZombie];
        const hitSet = new Set([closestZombie.id]);

        // Find chain targets
        let current = closestZombie;
        for (let c = 0; c < maxChains; c++) {
          const cPos = current.getComponent('Transform').position;
          let bestDist = Infinity;
          let bestZ = null;
          for (const z of zombies) {
            if (!z.alive || hitSet.has(z.id)) continue;
            const zp = z.getComponent('Transform').position;
            const d = cPos.distanceTo(zp);
            if (d < chainRange && d < bestDist) {
              bestDist = d;
              bestZ = z;
            }
          }
          if (!bestZ) break;
          hit.push(bestZ);
          hitSet.add(bestZ.id);
          current = bestZ;
        }

        // Damage all chained targets (only on fire tick)
        if (canFire) for (const z of hit) {
          const hp = z.getComponent('Health');
          const dead = hp.takeDamage(turretAI.damage);
          if (dead) {
            const score = z.getComponent('ScoreValue');
            if (score) { gameState.score[1] += Math.ceil(score.points / 2); gameState.score[2] += Math.floor(score.points / 2); }
            const zp = z.getComponent('Transform').position;
            if (engine.powerUpSystem) engine.powerUpSystem.trySpawnDrop(entityManager, scene, { x: zp.x, z: zp.z });
            z.destroy();
            gameState.zombiesKilled++;
          }
        }

        // Draw thick beam meshes: turret → first target → chain → chain...
        const beamPoints = [new THREE.Vector3(origin.x, 1.4, origin.z)];
        for (const z of hit) {
          const zp = z.getComponent('Transform').position;
          beamPoints.push(new THREE.Vector3(zp.x, 1.0, zp.z));
        }

        for (let i = 0; i < beamPoints.length - 1; i++) {
          const a = beamPoints[i];
          const b = beamPoints[i + 1];
          const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
          const len = a.distanceTo(b);

          // Core beam (thick, bright)
          const coreGeo = new THREE.BoxGeometry(0.12, 0.12, len);
          const coreMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff, transparent: true, opacity: 0.9, fog: false,
          });
          const core = new THREE.Mesh(coreGeo, coreMat);
          core.position.copy(mid);
          core.lookAt(b);
          scene.add(core);
          this._laserBeams.push(core);

          // Outer glow (wider, more transparent)
          const glowGeo = new THREE.BoxGeometry(0.3, 0.3, len);
          const glowMat = new THREE.MeshBasicMaterial({
            color: i === 0 ? 0x00aaff : 0x0066ff,
            transparent: true, opacity: 0.3, fog: false,
          });
          const glow = new THREE.Mesh(glowGeo, glowMat);
          glow.position.copy(mid);
          glow.lookAt(b);
          scene.add(glow);
          this._laserBeams.push(glow);
        }

        // Spark particles at each hit point
        for (const z of hit) {
          if (!z.alive) continue;
          const zp = z.getComponent('Transform').position;
          particleSystem.emit(
            new THREE.Vector3(zp.x, 1.0, zp.z),
            new THREE.Vector3(0, 0, 0), 3, {
              speed: 4, speedVariance: 2, spread: 1.5,
              life: 0.1, lifeVariance: 0.03,
              size: 0.2, sizeVariance: 0.06,
              startColor: 0x00ffff, endColor: 0x0044aa,
            });
        }

        // Glow at emitter tip
        particleSystem.emitFlash(origin, 0x00ccff, 2, 0.08);

        // Pulse the core
        if (meshRef && meshRef.mesh) {
          const core = meshRef.mesh.getObjectByName('laserCore');
          if (core) {
            core.scale.setScalar(1 + Math.sin(elapsed * 20) * 0.15);
          }
        }

      } else if (turretAI.weaponType === 'flame') {
        // Flamethrower: no projectile, direct damage in wide cone
        const range = turretAI.range;
        for (const zombie of zombies) {
          if (!zombie.alive) continue;
          const zPos = zombie.getComponent('Transform').position;
          const dx = zPos.x - turretPos.x;
          const dz = zPos.z - turretPos.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist > range) continue;
          const nx = dx / (dist || 1);
          const nz = dz / (dist || 1);
          const dot = nx * dir.x + nz * dir.z;
          if (dot < 0.4) continue; // ~66 degree cone (wider)

          const hp = zombie.getComponent('Health');
          const dead = hp.takeDamage(turretAI.damage);
          if (dead) {
            const score = zombie.getComponent('ScoreValue');
            if (score) { gameState.score[1] += Math.ceil(score.points / 2); gameState.score[2] += Math.floor(score.points / 2); }
            if (engine.powerUpSystem) engine.powerUpSystem.trySpawnDrop(entityManager, scene, { x: zPos.x, z: zPos.z });

            zombie.destroy();
            gameState.zombiesKilled++;
          }
        }

        // --- Full cone fire effect ---
        // Core flame stream: fast, bright white-yellow at nozzle
        particleSystem.emit(origin, dir, 4, {
          speed: 12, speedVariance: 3, spread: 0.3,
          life: 0.15, lifeVariance: 0.04,
          size: 0.5, sizeVariance: 0.1,
          startColor: 0xffffaa, endColor: 0xff8800,
        });

        // Mid flame: orange expanding outward
        const mid = new THREE.Vector3(
          origin.x + dir.x * range * 0.4,
          origin.y,
          origin.z + dir.z * range * 0.4,
        );
        particleSystem.emit(mid, dir, 5, {
          speed: 8, speedVariance: 4, spread: 0.8,
          life: 0.25, lifeVariance: 0.08,
          size: 0.7, sizeVariance: 0.2,
          startColor: 0xff6600, endColor: 0xcc2200,
        });

        // Outer flame: red, wide spread at the far end of the cone
        const far = new THREE.Vector3(
          origin.x + dir.x * range * 0.7,
          origin.y,
          origin.z + dir.z * range * 0.7,
        );
        particleSystem.emit(far, dir, 3, {
          speed: 5, speedVariance: 3, spread: 1.2,
          life: 0.3, lifeVariance: 0.1,
          size: 0.9, sizeVariance: 0.3,
          startColor: 0xdd4400, endColor: 0x331100,
        });

        // Smoke wisps at edges
        particleSystem.emit(far, dir, 2, {
          speed: 3, speedVariance: 2, spread: 1.5,
          life: 0.4, lifeVariance: 0.15,
          size: 0.6, sizeVariance: 0.2,
          startColor: 0x555555, endColor: 0x111111,
        });

        // Continuous glow along the flame
        particleSystem.emitFlash(origin, 0xff8833, 3, 0.06);
        particleSystem.emitFlash(mid, 0xff6600, 2, 0.06);
      } else if (turretAI.weaponType === 'rocket') {
        createRocket(entityManager, scene, origin, dir, turretAI.projectileSpeed, turretAI.damage, 3.5, 30);

        const backDir = new THREE.Vector3(-dir.x, 0, -dir.z);
        particleSystem.emit(origin, backDir, 6, {
          speed: 5, speedVariance: 3, spread: 0.6,
          life: 0.3, lifeVariance: 0.1,
          size: 0.5, sizeVariance: 0.15,
          startColor: 0xaaaaaa, endColor: 0x333333,
        });
        particleSystem.emit(origin, dir, 3, {
          speed: 4, speedVariance: 2, spread: 0.3,
          life: 0.15, lifeVariance: 0.05,
          size: 0.4, sizeVariance: 0.1,
          startColor: 0xff6600, endColor: 0x441100,
        });
        particleSystem.emitFlash(origin, 0xff6622, 4, 0.12);
        audioSystem.playGunshot();
      } else if (turretAI.weaponType === 'mega') {
        // MEGA TURRET: dual miniguns (primary, alternating) + dual homing rocket pods (secondary)
        const meshRefMega = meshRef;

        // --- Minigun fire (alternating left/right barrels) ---
        const side = (turretAI.altFire % 2 === 0) ? 1 : -1;
        turretAI.altFire = (turretAI.altFire + 1) % 2;

        // Perpendicular offset for left/right minigun position (tight central cluster, matches model: 0.22 units)
        const perpX = -dir.z;
        const perpZ = dir.x;
        const mgOffset = 0.22;
        const bx = origin.x + perpX * mgOffset * side;
        const bz = origin.z + perpZ * mgOffset * side;
        // Push forward to barrel tip
        const mgOrigin = new THREE.Vector3(
          bx + dir.x * 0.5,
          origin.y - 0.05,
          bz + dir.z * 0.5,
        );

        // Slight random spread
        const spread = 0.06;
        const spreadDir = new THREE.Vector3(
          dir.x + (Math.random() - 0.5) * spread,
          0,
          dir.z + (Math.random() - 0.5) * spread,
        ).normalize();

        createProjectile(entityManager, scene, mgOrigin, spreadDir, turretAI.projectileSpeed, turretAI.damage);

        // Minigun muzzle flash
        particleSystem.emit(mgOrigin, dir, 3, {
          speed: 14, speedVariance: 4, spread: 0.15,
          life: 0.07, lifeVariance: 0.02,
          size: 0.22, sizeVariance: 0.06,
          startColor: 0xffffaa, endColor: 0xff6600,
        });
        particleSystem.emitFlash(mgOrigin, 0xffee44, 2, 0.05);

        // Spin minigun muzzle tip visual
        if (meshRefMega && meshRefMega.mesh) {
          const tipName = side > 0 ? 'megaMuzzleR' : 'megaMuzzleL';
          const tip = meshRefMega.mesh.getObjectByName(tipName);
          if (tip) tip.rotation.z += 0.6;
        }

        audioSystem.playGunshot();

        // --- Homing rocket fire (secondary, independent cooldown) ---
        const secReady = elapsed - turretAI.lastFiredSecondary >= turretAI.secondaryFireRate;
        if (secReady) {
          turretAI.lastFiredSecondary = elapsed;

          // Alternate which rocket pod fires (outboard on the flanks, matches model: 0.85 units)
          const podSide = (Math.floor(elapsed / turretAI.secondaryFireRate) % 2 === 0) ? 1 : -1;
          const podOffset = 0.85;
          const podX = origin.x + perpX * podOffset * podSide;
          const podZ = origin.z + perpZ * podOffset * podSide;
          const podOrigin = new THREE.Vector3(
            podX + dir.x * 0.3,
            origin.y,
            podZ + dir.z * 0.3,
          );

          // Fire 2 mini homing rockets per pod in quick succession (slight spread)
          for (let i = 0; i < 2; i++) {
            const angleOff = (i === 0 ? -0.15 : 0.15);
            const cos = Math.cos(angleOff);
            const sin = Math.sin(angleOff);
            const rdir = new THREE.Vector3(
              dir.x * cos - dir.z * sin,
              0,
              dir.x * sin + dir.z * cos,
            );
            createRocket(
              entityManager, scene,
              podOrigin, rdir,
              14, turretAI.secondaryDamage,
              1.8, turretAI.secondaryDamage,
              { homing: true, scale: 0.6 },
            );
          }

          // Launch effects — backblast + fire + smoke
          const backDir = new THREE.Vector3(-dir.x, 0, -dir.z);
          particleSystem.emit(podOrigin, backDir, 5, {
            speed: 5, speedVariance: 2, spread: 0.5,
            life: 0.35, lifeVariance: 0.1,
            size: 0.45, sizeVariance: 0.15,
            startColor: 0xaaaaaa, endColor: 0x222222,
          });
          particleSystem.emit(podOrigin, dir, 4, {
            speed: 7, speedVariance: 2, spread: 0.25,
            life: 0.18, lifeVariance: 0.06,
            size: 0.4, sizeVariance: 0.1,
            startColor: 0xff9933, endColor: 0x441100,
          });
          particleSystem.emitFlash(podOrigin, 0xff6622, 5, 0.12);

          // Pulse pod tip
          if (meshRefMega && meshRefMega.mesh) {
            const podName = podSide > 0 ? 'megaPodR' : 'megaPodL';
            const podTip = meshRefMega.mesh.getObjectByName(podName);
            if (podTip && podTip.material && podTip.material.color) {
              podTip.material.color.setHex(0xffff66);
              setTimeout(() => {
                if (podTip.material && podTip.material.color) podTip.material.color.setHex(0xff5522);
              }, 80);
            }
          }

          audioSystem.playGunshot();
        }
      } else if (turretAI.weaponType === 'minigun') {
        // Rapid fire with slight random spread — spray and pray
        const spread = 0.08;
        const spreadDir = new THREE.Vector3(
          dir.x + (Math.random() - 0.5) * spread,
          0,
          dir.z + (Math.random() - 0.5) * spread,
        ).normalize();

        createProjectile(entityManager, scene, origin, spreadDir, turretAI.projectileSpeed, turretAI.damage);

        // Small fast muzzle flash
        particleSystem.emit(origin, dir, 2, {
          speed: 14, speedVariance: 4, spread: 0.15,
          life: 0.06, lifeVariance: 0.02,
          size: 0.2, sizeVariance: 0.06,
          startColor: 0xffffaa, endColor: 0xff6600,
        });

        // Spinning barrel visual — rotate the muzzle tip
        if (meshRef && meshRef.mesh) {
          const tip = meshRef.mesh.getObjectByName('muzzleTip');
          if (tip) tip.rotation.z += 0.5;
        }

        // Occasional bigger tracer flash (every ~5th shot)
        if (Math.random() < 0.2) {
          particleSystem.emitFlash(origin, 0xffee44, 2, 0.04);
        }
        audioSystem.playGunshot();
      } else if (turretAI.weaponType === 'dualgun') {
        // Two projectiles from parallel barrels
        // Perpendicular offset for left/right barrel (0.25 units apart)
        const perpX = -dir.z;
        const perpZ = dir.x;
        const barrelOffset = 0.25;

        for (const side of [-1, 1]) {
          const bx = origin.x + perpX * barrelOffset * side;
          const bz = origin.z + perpZ * barrelOffset * side;
          const barrelPos = new THREE.Vector3(bx, origin.y, bz);

          createProjectile(entityManager, scene, barrelPos, dir, turretAI.projectileSpeed, turretAI.damage);

          particleSystem.emit(barrelPos, dir, 3, {
            speed: 9, speedVariance: 3, spread: 0.2,
            life: 0.1, lifeVariance: 0.03,
            size: 0.3, sizeVariance: 0.08,
            startColor: 0xffff44, endColor: 0xff8800,
          });
          particleSystem.emitFlash(barrelPos, 0xffee44, 3, 0.08);
        }
        audioSystem.playGunshot();
      } else {
        createProjectile(entityManager, scene, origin, dir, turretAI.projectileSpeed, turretAI.damage);

        particleSystem.emit(origin, dir, 5, {
          speed: 8, speedVariance: 3, spread: 0.3,
          life: 0.15, lifeVariance: 0.04,
          size: 0.4, sizeVariance: 0.1,
          startColor: 0xffff44, endColor: 0xff8800,
        });
        particleSystem.emitFlash(origin, 0xffee44, 5, 0.18);
        audioSystem.playGunshot();
      }
    }
  }

  _processMortarStrikes(dt, engine) {
    const { entityManager, gameState, audioSystem, particleSystem } = engine;
    const scene = engine.renderSystem.scene;

    for (const strike of entityManager.getEntitiesByTag('mortarStrike')) {
      if (!strike.alive) continue;
      const ms = strike.getComponent('MortarStrike');
      ms.timer -= dt;

      // Warning circle — subtle pulse, ramps up near impact
      if (ms.warningMesh) {
        const urgency = 1 - (ms.timer / ms.flightTime);
        // Very faint at start, slightly brighter near impact
        const baseOpacity = 0.05 + urgency * 0.15;
        const pulse = Math.sin(urgency * 20) * 0.03;
        ms.warningMesh.material.opacity = baseOpacity + pulse;
        ms.warningMesh.rotation.y += dt * 0.5;
      }

      // Incoming rocket trail — visible in last 0.6s, streaking down with fire + smoke
      if (ms.timer < 0.6 && ms.timer > 0) {
        const t = ms.timer / 0.6;
        const rocketY = t * 15;

        // Rocket body (bright core)
        particleSystem.emit(
          new THREE.Vector3(ms.targetX, rocketY, ms.targetZ),
          new THREE.Vector3(0, -1, 0), 2, {
            speed: 10, speedVariance: 3, spread: 0.1,
            life: 0.12, lifeVariance: 0.03,
            size: 0.35, sizeVariance: 0.1,
            startColor: 0xffffaa, endColor: 0xff4400,
            ySpeed: -8,
          });

        // Smoke trail behind rocket
        particleSystem.emit(
          new THREE.Vector3(ms.targetX, rocketY + 1, ms.targetZ),
          new THREE.Vector3(0, 0, 0), 1, {
            speed: 1, speedVariance: 1, spread: 0.3,
            life: 0.3, lifeVariance: 0.1,
            size: 0.25, sizeVariance: 0.08,
            startColor: 0x888888, endColor: 0x222222,
            ySpeed: 1,
          });
      }

      if (ms.timer > 0) continue;

      // IMPACT — remove warning, explode
      if (ms.warningMesh) {
        scene.remove(ms.warningMesh);
        ms.warningMesh.geometry.dispose();
        ms.warningMesh.material.dispose();
      }
      strike.destroy();

      const hitPos = new THREE.Vector3(ms.targetX, 0.5, ms.targetZ);

      // Big explosion
      const outDir = new THREE.Vector3(0, 0, 0);
      particleSystem.emit(hitPos, outDir, 18, {
        speed: 10, speedVariance: 5, spread: 2.5,
        life: 0.5, lifeVariance: 0.15,
        size: 0.7, sizeVariance: 0.2,
        startColor: 0xff8800, endColor: 0x220000,
        ySpeed: 3,
      });
      particleSystem.emit(hitPos, outDir, 8, {
        speed: 4, speedVariance: 2, spread: 2.0,
        life: 0.7, lifeVariance: 0.2,
        size: 0.6, sizeVariance: 0.2,
        startColor: 0x888888, endColor: 0x222222,
      });
      particleSystem.emitFlash(hitPos, 0xff4400, 8, 0.2);
      audioSystem.playZombieDeath();

      // Blood splatter


      // AoE damage
      for (const zombie of entityManager.getEntitiesByTag('zombie')) {
        if (!zombie.alive) continue;
        const zPos = zombie.getComponent('Transform').position;
        const dx = zPos.x - ms.targetX;
        const dz = zPos.z - ms.targetZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= ms.radius) {
          const falloff = 1 - (dist / ms.radius) * 0.5;
          const dmg = Math.floor(ms.damage * falloff);
          const hp = zombie.getComponent('Health');
          const dead = hp.takeDamage(dmg);
          if (dead) {
            const score = zombie.getComponent('ScoreValue');
            if (score) { gameState.score[1] += Math.ceil(score.points / 2); gameState.score[2] += Math.floor(score.points / 2); }
            if (engine.powerUpSystem) engine.powerUpSystem.trySpawnDrop(entityManager, scene, { x: zPos.x, z: zPos.z });

            zombie.destroy();
            gameState.zombiesKilled++;
          } else {
            const meshRef = zombie.getComponent('MeshRef');
            if (meshRef && meshRef.mesh) this._flashEntity(meshRef.mesh);
          }
        }
      }
    }
  }

  _processHomingTrails(dt, engine) {
    const { entityManager, particleSystem, elapsed } = engine;

    for (const rocket of entityManager.getEntitiesByTag('homing')) {
      if (!rocket.alive) continue;
      const t = rocket.getComponent('Transform');
      const v = rocket.getComponent('Velocity');
      if (!t || !v) continue;

      // Emit trail behind the rocket
      const backDir = new THREE.Vector3(-v.direction.x, 0, -v.direction.z);
      const back = new THREE.Vector3(
        t.position.x - v.direction.x * 0.25,
        1.15,
        t.position.z - v.direction.z * 0.25,
      );

      // Hot yellow-white core
      particleSystem.emit(back, backDir, 1, {
        speed: 2, speedVariance: 0.6, spread: 0.1,
        life: 0.12, lifeVariance: 0.04,
        size: 0.14, sizeVariance: 0.04,
        startColor: 0xffffaa, endColor: 0xff5500,
      });

      // Small orange flame puff
      particleSystem.emit(back, backDir, 1, {
        speed: 1.2, speedVariance: 0.6, spread: 0.3,
        life: 0.2, lifeVariance: 0.06,
        size: 0.2, sizeVariance: 0.06,
        startColor: 0xff6622, endColor: 0x441100,
      });

      // Thin smoke puff
      if (Math.random() < 0.6) {
        particleSystem.emit(back, backDir, 1, {
          speed: 0.8, speedVariance: 0.4, spread: 0.4,
          life: 0.28, lifeVariance: 0.08,
          size: 0.22, sizeVariance: 0.08,
          startColor: 0x888888, endColor: 0x222222,
        });
      }

      // Pulse exhaust + flame mesh scales (smaller amplitude)
      const meshRef = rocket.getComponent('MeshRef');
      if (meshRef && meshRef.mesh) {
        const pulse = 1 + Math.sin(elapsed * 30 + rocket.id) * 0.15;
        const exhaust = meshRef.mesh.getObjectByName('rocketExhaust');
        if (exhaust) exhaust.scale.set(pulse, pulse, pulse);
        const flame = meshRef.mesh.getObjectByName('rocketFlame');
        if (flame) {
          flame.scale.set(pulse, pulse, 1 + Math.sin(elapsed * 40 + rocket.id) * 0.2);
        }
      }
    }
  }

  _processMines(engine) {
    const { entityManager, gameState, audioSystem, particleSystem } = engine;
    const mines = entityManager.getEntitiesByTag('mine');
    if (mines.length === 0) return;

    const zombies = entityManager.getEntitiesByTag('zombie');

    for (const mine of mines) {
      if (!mine.alive) continue;
      const mineComp = mine.getComponent('Mine');
      if (!mineComp.armed) continue;

      const minePos = mine.getComponent('Transform').position;

      // Blink the red light
      const meshRef = mine.getComponent('MeshRef');
      if (meshRef && meshRef.mesh) {
        const light = meshRef.mesh.getObjectByName('mineLight');
        if (light) {
          light.visible = Math.sin(Date.now() * 0.006) > 0;
        }
      }

      // Check if any zombie is in trigger radius
      let triggered = false;
      for (const zombie of zombies) {
        if (!zombie.alive) continue;
        const zPos = zombie.getComponent('Transform').position;
        const dx = zPos.x - minePos.x;
        const dz = zPos.z - minePos.z;
        if (dx * dx + dz * dz < mineComp.triggerRadius * mineComp.triggerRadius) {
          triggered = true;
          break;
        }
      }

      if (!triggered) continue;

      // BOOM
      mine.destroy();

      const hitPos = new (THREE.Vector3)(minePos.x, 0.5, minePos.z);

      // Explosion particles
      const outDir = new THREE.Vector3(0, 0, 0);
      particleSystem.emit(hitPos, outDir, 25, {
        speed: 12, speedVariance: 6, spread: 2.5,
        life: 0.6, lifeVariance: 0.2,
        size: 0.6, sizeVariance: 0.2,
        startColor: 0xff8800, endColor: 0x220000, ySpeed: 3,
      });
      particleSystem.emit(hitPos, outDir, 12, {
        speed: 5, speedVariance: 3, spread: 2.0,
        life: 0.8, lifeVariance: 0.2,
        size: 0.7, sizeVariance: 0.2,
        startColor: 0x999999, endColor: 0x222222,
      });
      particleSystem.emitFlash(hitPos, 0xff6600, 10, 0.25);
      audioSystem.playZombieDeath();

      // AoE damage
      for (const zombie of zombies) {
        if (!zombie.alive) continue;
        const zPos = zombie.getComponent('Transform').position;
        const dx = zPos.x - minePos.x;
        const dz = zPos.z - minePos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= mineComp.explosionRadius) {
          const falloff = 1 - (dist / mineComp.explosionRadius) * 0.5;
          const dmg = Math.floor(mineComp.explosionDamage * falloff);
          const hp = zombie.getComponent('Health');
          const dead = hp.takeDamage(dmg);
          if (dead) {
            const score = zombie.getComponent('ScoreValue');
            if (score) { gameState.score[1] += Math.ceil(score.points / 2); gameState.score[2] += Math.floor(score.points / 2); }
            if (engine.powerUpSystem) engine.powerUpSystem.trySpawnDrop(entityManager, engine.renderSystem.scene, { x: zPos.x, z: zPos.z });

            zombie.destroy();
            gameState.zombiesKilled++;
          } else {
            const zMesh = zombie.getComponent('MeshRef');
            if (zMesh && zMesh.mesh) this._flashEntity(zMesh.mesh);
          }
        }
      }
    }
  }

  _explodeRocket(hitPos, rocket, engine) {
    const { entityManager, gameState, audioSystem, particleSystem } = engine;

    // Big explosion particles
    const outDir = new THREE.Vector3(0, 0, 0);
    particleSystem.emit(hitPos, outDir, 20, {
      speed: 10,
      speedVariance: 6,
      spread: 2.5,
      life: 0.5,
      lifeVariance: 0.15,
      size: 0.7,
      sizeVariance: 0.2,
      startColor: 0xff6600,
      endColor: 0x220000,
      ySpeed: 2,
    });
    // Smoke ring
    particleSystem.emit(hitPos, outDir, 10, {
      speed: 6,
      speedVariance: 3,
      spread: 2.0,
      life: 0.6,
      lifeVariance: 0.2,
      size: 0.6,
      sizeVariance: 0.2,
      startColor: 0x888888,
      endColor: 0x222222,
    });
    // Bright flash
    particleSystem.emitFlash(hitPos, 0xff4400, 8, 0.2);

    // AoE damage to all enemies in radius
    for (const zombie of entityManager.getEntitiesByTag('zombie')) {
      if (!zombie.alive) continue;
      const zPos = zombie.getComponent('Transform').position;
      const dx = zPos.x - hitPos.x;
      const dz = zPos.z - hitPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= rocket.explosionRadius) {
        // Damage falloff: full at center, half at edge
        const falloff = 1 - (dist / rocket.explosionRadius) * 0.5;
        const dmg = Math.floor(rocket.explosionDamage * falloff);
        const hp = zombie.getComponent('Health');
        const dead = hp.takeDamage(dmg);
        if (dead) {
          const score = zombie.getComponent('ScoreValue');
          if (score) { gameState.score[1] += Math.ceil(score.points / 2); gameState.score[2] += Math.floor(score.points / 2); }
          if (engine.powerUpSystem) engine.powerUpSystem.trySpawnDrop(entityManager, engine.renderSystem.scene, { x: zPos.x, z: zPos.z });
          if (engine.environmentSystem) engine.environmentSystem.addBloodSplatter(zPos.x, zPos.z);
          zombie.destroy();
          gameState.zombiesKilled++;
        } else {
          const meshRef = zombie.getComponent('MeshRef');
          if (meshRef && meshRef.mesh) this._flashEntity(meshRef.mesh);
        }
      }
    }

    audioSystem.playZombieDeath(); // reuse as explosion sound
  }

  _flashEntity(mesh) {
    mesh.traverse((child) => {
      if (!child.material || !child.material.color) return;
      // Clone material so we don't affect shared instances
      const origMat = child.material;
      const flashMat = origMat.clone();
      flashMat.color.setHex(0xff2222);
      child.material = flashMat;
      setTimeout(() => {
        child.material = origMat;
        flashMat.dispose();
      }, 120);
    });
  }
}
