import { CONFIG } from '../config/gameConfig.js';
import { angleBetween, clamp } from '../utils/math.js';

export class MovementSystem {
  update(dt, entityManager, inputSystem) {
    const players = entityManager.getEntitiesByTag('player');
    const half = CONFIG.world.groundSize / 2 - 1;

    // All players movement
    for (const player of players) {
      const pInput = player.getComponent('PlayerInput');
      if (!pInput) continue; // skip NPCs
      const idx = pInput.playerIndex;
      const transform = player.getComponent('Transform');
      const velocity = player.getComponent('Velocity');
      if (!velocity) continue;

      const move = inputSystem.getMovementForPlayer
        ? inputSystem.getMovementForPlayer(idx)
        : inputSystem.getMovementVector();

      transform.position.x += move.x * velocity.speed * dt;
      transform.position.z += move.z * velocity.speed * dt;
      transform.position.x = clamp(transform.position.x, -half, half);
      transform.position.z = clamp(transform.position.z, -half, half);

      // Update aim world position for this player
      if (inputSystem.updateAimWorldPos) {
        inputSystem.updateAimWorldPos(idx, transform.position.x, transform.position.z, 15);
      }

      // Face toward aim direction
      transform.rotation = inputSystem.getAimForPlayer
        ? inputSystem.getAimForPlayer(idx, transform.position.x, transform.position.z)
        : inputSystem.getAimAngle(transform.position.x, transform.position.z);
    }

    // Zombie AI movement
    const base = entityManager.getEntitiesByTag('base')[0];
    const basePos = base ? base.getComponent('Transform').position : null;
    const barricades = entityManager.getEntitiesByTag('barricade');
    const turrets = entityManager.getEntitiesByTag('turret');

    for (const entity of entityManager.getEntitiesByTag('zombie')) {
      const transform = entity.getComponent('Transform');
      const velocity = entity.getComponent('Velocity');
      const ai = entity.getComponent('ZombieAI');
      const pInput = entity.getComponent('PlayerInput');

      // Player-controlled zombie: use gamepad/keyboard input
      if (pInput) {
        const idx = pInput.playerIndex;
        const move = inputSystem.getMovementForPlayer
          ? inputSystem.getMovementForPlayer(idx)
          : { x: 0, z: 0 };

        transform.position.x += move.x * velocity.speed * dt;
        transform.position.z += move.z * velocity.speed * dt;
        transform.position.x = clamp(transform.position.x, -half, half);
        transform.position.z = clamp(transform.position.z, -half, half);

        if (Math.abs(move.x) > 0.1 || Math.abs(move.z) > 0.1) {
          transform.rotation = Math.atan2(move.x, move.z);
        }

        // Auto-attack: check proximity to base and other players
        ai.state = 'moving';
        if (basePos) {
          const dist = transform.position.distanceTo(basePos);
          if (dist <= ai.attackRange + 1.5) ai.state = 'attacking';
        }
        for (const p of players) {
          if (!p.alive || p.getComponent('PlayerInput')?.playerIndex === idx) continue;
          const dist = transform.position.distanceTo(p.getComponent('Transform').position);
          if (dist <= ai.attackRange) ai.state = 'attacking';
        }
        continue;
      }

      if (ai.state !== 'moving') continue;

      // AI zombie: pick closest target (base, player, or barricade)
      let targetPos = basePos;
      let bestDist = basePos ? transform.position.distanceTo(basePos) : Infinity;

      for (const p of players) {
        if (!p.alive) continue;
        const d = transform.position.distanceTo(p.getComponent('Transform').position);
        if (d < bestDist * 0.7) {
          bestDist = d;
          targetPos = p.getComponent('Transform').position;
        }
      }

      // Barricades and turrets attract zombies if nearby
      for (const b of barricades) {
        if (!b.alive) continue;
        const bp = b.getComponent('Transform').position;
        const d = transform.position.distanceTo(bp);
        if (d < 8 && d < bestDist) {
          bestDist = d;
          targetPos = bp;
        }
      }
      for (const t of turrets) {
        if (!t.alive) continue;
        const tp = t.getComponent('Transform').position;
        const d = transform.position.distanceTo(tp);
        if (d < 6 && d < bestDist) {
          bestDist = d;
          targetPos = tp;
        }
      }

      if (!targetPos) continue;

      const dx = targetPos.x - transform.position.x;
      const dz = targetPos.z - transform.position.z;
      const len = Math.sqrt(dx * dx + dz * dz);

      if (len > 0.1) {
        velocity.direction.x = dx / len;
        velocity.direction.z = dz / len;
        transform.rotation = angleBetween(
          transform.position.x, transform.position.z,
          targetPos.x, targetPos.z,
        );
      }

      if (len <= ai.attackRange) {
        ai.state = 'attacking';
        velocity.direction.set(0, 0, 0);
      } else {
        let moveX = velocity.direction.x;
        let moveZ = velocity.direction.z;

        if (ai.maneuver && len > ai.attackRange + 2) {
          ai.maneuverPhase += ai.maneuverFreq * dt * Math.PI * 2;
          const lateralStrength = Math.sin(ai.maneuverPhase) * ai.maneuverAmp;
          const perpX = -velocity.direction.z;
          const perpZ = velocity.direction.x;
          moveX += perpX * lateralStrength;
          moveZ += perpZ * lateralStrength;
        }

        transform.position.x += moveX * velocity.speed * dt;
        transform.position.z += moveZ * velocity.speed * dt;
      }
    }

    // Projectile movement + lifetime + auto-aim correction
    const zombiesForAim = entityManager.getEntitiesByTag('zombie');
    for (const entity of entityManager.getEntitiesWith('Velocity', 'Transform', 'Lifetime')) {
      const transform = entity.getComponent('Transform');
      const velocity = entity.getComponent('Velocity');
      const lifetime = entity.getComponent('Lifetime');

      // Auto-aim: steer toward nearest zombie in a forward cone.
      // - Plain projectiles (bullets): gentle assist.
      // - Homing rockets: aggressive seek with wide detection cone.
      const isHoming = entity.hasTag('homing');
      const isAutoBullet = entity.hasTag('projectile') && !entity.hasTag('rocket');
      if (isHoming || isAutoBullet) {
        let bestDot = isHoming ? 0.2 : 0.85; // homing: ~80deg cone, bullets: ~30deg
        const maxRange = isHoming ? 16 : 10;
        let bestDx = 0, bestDz = 0, bestDist = Infinity;

        for (const z of zombiesForAim) {
          if (!z.alive) continue;
          const zp = z.getComponent('Transform').position;
          const dx = zp.x - transform.position.x;
          const dz = zp.z - transform.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist > maxRange || dist < 0.3) continue;
          // Dot product with current direction
          const nx = dx / dist;
          const nz = dz / dist;
          const dot = nx * velocity.direction.x + nz * velocity.direction.z;
          if (dot > bestDot && dist < bestDist) {
            bestDot = dot;
            bestDx = nx;
            bestDz = nz;
            bestDist = dist;
          }
        }

        if (bestDist < Infinity) {
          // Steering strength: homing rockets turn harder than bullets
          const steer = (isHoming ? 6.0 : 3.0) * dt;
          velocity.direction.x += (bestDx - velocity.direction.x) * steer;
          velocity.direction.z += (bestDz - velocity.direction.z) * steer;
          // Re-normalize
          const len2 = Math.sqrt(velocity.direction.x ** 2 + velocity.direction.z ** 2) || 1;
          velocity.direction.x /= len2;
          velocity.direction.z /= len2;
          // Keep mesh rotation aligned with heading (rockets face where they fly)
          if (isHoming) {
            transform.rotation = Math.atan2(velocity.direction.x, velocity.direction.z);
          }
        }
      }

      transform.position.x += velocity.direction.x * velocity.speed * dt;
      transform.position.z += velocity.direction.z * velocity.speed * dt;

      lifetime.remaining -= dt;
      if (lifetime.remaining <= 0) {
        entity.destroy();
      }
    }
  }
}
