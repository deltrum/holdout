import * as THREE from 'three';
import { VoxelBuilder } from '../rendering/VoxelBuilder.js';
import { createProjectile } from '../entities/createProjectile.js';

const FLIGHT_HEIGHT = 7;
const ORBIT_RADIUS = 14;
const ORBIT_CENTER = { x: 0, z: 0 };
const ORBIT_SPEED = 0.55;        // radians per second
const FLIGHT_SPEED = ORBIT_SPEED * ORBIT_RADIUS; // ~7.7 u/s — same linear speed as orbit tangent
const TOTAL_REVOLUTIONS = 3;
const FIRE_RATE = 0.08;          // seconds between shots
const FIRE_RANGE = 16;
const ENTRY_ANGLE = Math.PI;     // approach from the west
const OFFMAP_START_X = -40;
const OUTBOUND_TARGET = { x: 45, z: -35 };
const GUN_TURN_SPEED = 7;        // radians per second
const GUN_AIM_TOLERANCE = 0.18;  // radians — how close gun must point to target before firing
// Gun rest angle: +π/2 rotates the gun's local +Z forward vector into +X, so the
// barrel sticks OUT the right-side door (away from the fuselage) instead of back
// into it. Kept constrained to this outward arc when tracking targets.
const GUN_REST_ANGLE = Math.PI / 2;
// Gun swings through the full right semicircle: forward (0) → right (π/2) → backward (π).
// That lets it engage targets ahead during inbound and behind during outbound.
const GUN_MIN_ANGLE = 0;
const GUN_MAX_ANGLE = Math.PI;

const PHASES = {
  IDLE: 0,
  INBOUND: 1,
  ORBIT: 2,
  OUTBOUND: 3,
  DONE: 4,
};

// Gunship helicopter — enters the map, circles the base firing a side-mounted
// minigun at zombies, then departs. Gun rotates smoothly to track targets.
export class GunshipSystem {
  constructor(scene) {
    this._scene = scene;
    this._mesh = null;
    this._phase = PHASES.IDLE;
    this._posX = OFFMAP_START_X;
    this._posZ = 0;
    this._posY = FLIGHT_HEIGHT;
    this._angle = ENTRY_ANGLE;
    this._totalSwept = 0;
    this._fireTimer = 0;
    this._entryX = 0;
    this._entryZ = 0;
    this._gunAngle = GUN_REST_ANGLE; // local gun rotation (around Y) relative to heli body
    this._gunGroup = null;
  }

  spawn() {
    if (this._phase !== PHASES.IDLE && this._phase !== PHASES.DONE) return;

    this._entryX = ORBIT_CENTER.x + Math.cos(ENTRY_ANGLE) * ORBIT_RADIUS;
    this._entryZ = ORBIT_CENTER.z + Math.sin(ENTRY_ANGLE) * ORBIT_RADIUS;
    this._posX = OFFMAP_START_X;
    this._posZ = this._entryZ;
    this._posY = FLIGHT_HEIGHT;
    this._angle = ENTRY_ANGLE;
    this._totalSwept = 0;
    this._fireTimer = 0;
    this._gunAngle = GUN_REST_ANGLE;

    this._mesh = this._createGunshipModel();
    this._mesh.position.set(this._posX, this._posY, this._posZ);
    this._mesh.rotation.y = Math.PI / 2; // face east
    this._scene.add(this._mesh);
    this._gunGroup = this._mesh.getObjectByName('gunshipGun');
    if (this._gunGroup) this._gunGroup.rotation.y = this._gunAngle;
    this._phase = PHASES.INBOUND;
  }

  update(dt, engine) {
    if (this._phase === PHASES.IDLE || this._phase === PHASES.DONE || !this._mesh) return;

    // Main rotor spin
    const rotor = this._mesh.getObjectByName('gunshipRotor');
    if (rotor) rotor.rotation.y += dt * 35;
    // Tail rotor spin
    const tRotor = this._mesh.getObjectByName('gunshipTailRotor');
    if (tRotor) tRotor.rotation.x += dt * 45;

    // Exhaust puffs
    if (engine.particleSystem && Math.random() < 0.4) {
      engine.particleSystem.emit(
        new THREE.Vector3(this._posX, this._posY - 0.4, this._posZ),
        new THREE.Vector3(0, 0, 0), 1, {
          speed: 1.2, speedVariance: 0.5, spread: 0.3,
          life: 0.35, lifeVariance: 0.1, size: 0.3, sizeVariance: 0.08,
          startColor: 0x666666, endColor: 0x222222, ySpeed: -1,
        });
    }

    // --- Movement by phase ---
    switch (this._phase) {
      case PHASES.INBOUND: {
        const dx = this._entryX - this._posX;
        const dz = this._entryZ - this._posZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 0.6) {
          this._posX += (dx / dist) * FLIGHT_SPEED * dt;
          this._posZ += (dz / dist) * FLIGHT_SPEED * dt;
          this._mesh.rotation.y = Math.atan2(dx, dz);
        } else {
          this._phase = PHASES.ORBIT;
        }
        break;
      }

      case PHASES.ORBIT: {
        // Clockwise orbit (angle decreases) — right side of heli faces the base center
        this._angle -= ORBIT_SPEED * dt;
        this._totalSwept += ORBIT_SPEED * dt;
        this._posX = ORBIT_CENTER.x + Math.cos(this._angle) * ORBIT_RADIUS;
        this._posZ = ORBIT_CENTER.z + Math.sin(this._angle) * ORBIT_RADIUS;
        const vx = Math.sin(this._angle);
        const vz = -Math.cos(this._angle);
        this._mesh.rotation.y = Math.atan2(vx, vz);

        // Slight vertical wobble
        this._posY = FLIGHT_HEIGHT + Math.sin(this._totalSwept * 3) * 0.15;

        if (this._totalSwept >= Math.PI * 2 * TOTAL_REVOLUTIONS) {
          this._phase = PHASES.OUTBOUND;
        }
        break;
      }

      case PHASES.OUTBOUND: {
        const dx = OUTBOUND_TARGET.x - this._posX;
        const dz = OUTBOUND_TARGET.z - this._posZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 1) {
          this._posX += (dx / dist) * FLIGHT_SPEED * dt;
          this._posZ += (dz / dist) * FLIGHT_SPEED * dt;
          this._mesh.rotation.y = Math.atan2(dx, dz);
        } else {
          this._cleanup();
          break;
        }
        break;
      }
    }

    if (this._mesh) this._mesh.position.set(this._posX, this._posY, this._posZ);
    if (!this._mesh) return; // gunship just despawned

    // --- Aim + fire EVERY phase while active (inbound, orbit, outbound) ---
    const target = this._findTarget(engine);
    let aimed = false;
    if (target) {
      const desired = this._desiredGunAngle(target);
      aimed = this._steerGun(dt, desired);
    } else {
      this._steerGun(dt, GUN_REST_ANGLE);
    }

    this._fireTimer -= dt;
    if (this._fireTimer <= 0 && target && aimed) {
      this._fireTimer = FIRE_RATE;
      this._fireSideGun(engine, target);
    }
  }

  _findTarget(engine) {
    // Compute gun world position for range checks
    const heading = this._mesh.rotation.y;
    // Helicopter-right vector in world: (cos(heading), -sin(heading))
    const rx = Math.cos(heading);
    const rz = -Math.sin(heading);
    // Gun mount world position (right side of heli)
    const gunX = this._posX + rx * 0.55;
    const gunZ = this._posZ + rz * 0.55;

    const zombies = engine.entityManager.getEntitiesByTag('zombie');
    let best = null;
    let bestScore = Infinity;
    for (const z of zombies) {
      if (!z.alive) continue;
      const zp = z.getComponent('Transform').position;
      const dx = zp.x - gunX;
      const dz = zp.z - gunZ;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > FIRE_RANGE || d < 0.5) continue;
      // Target must be on the right-half of the heli (gun can only swing through that semicircle)
      const dot = (dx / d) * rx + (dz / d) * rz;
      if (dot < -0.05) continue;
      // Score favors closer targets that are more centered on the right side
      const score = d - dot * 2;
      if (score < bestScore) {
        bestScore = score;
        best = { e: z, tx: zp.x, tz: zp.z, gunX, gunZ };
      }
    }
    return best;
  }

  // Desired gun local angle (in heli body frame) to point at target
  _desiredGunAngle(target) {
    const heading = this._mesh.rotation.y;
    const worldAngleToTarget = Math.atan2(target.tx - target.gunX, target.tz - target.gunZ);
    let local = worldAngleToTarget - heading;
    // Normalize to [-PI, PI]
    while (local > Math.PI) local -= Math.PI * 2;
    while (local < -Math.PI) local += Math.PI * 2;
    return local;
  }

  // Smoothly rotate gun toward desired angle. Returns true if aimed within tolerance
  // — comparing against the unclamped desired, so unreachable targets don't falsely
  // register as aimed when the gun is parked at the clamp endpoint.
  _steerGun(dt, desired) {
    const clamped = Math.max(GUN_MIN_ANGLE, Math.min(GUN_MAX_ANGLE, desired));
    const diff = clamped - this._gunAngle;
    const maxTurn = GUN_TURN_SPEED * dt;
    if (Math.abs(diff) <= maxTurn) {
      this._gunAngle = clamped;
    } else {
      this._gunAngle += Math.sign(diff) * maxTurn;
    }
    if (this._gunAngle < GUN_MIN_ANGLE) this._gunAngle = GUN_MIN_ANGLE;
    if (this._gunAngle > GUN_MAX_ANGLE) this._gunAngle = GUN_MAX_ANGLE;
    if (this._gunGroup) this._gunGroup.rotation.y = this._gunAngle;
    return Math.abs(desired - this._gunAngle) < GUN_AIM_TOLERANCE;
  }

  _fireSideGun(engine, target) {
    // Use actual gun muzzle world position + actual gun forward direction
    const muzzle = this._mesh.getObjectByName('gunshipMuzzle');
    if (!muzzle) return;

    const muzzleWorld = new THREE.Vector3();
    muzzle.getWorldPosition(muzzleWorld);

    // Forward direction of gun in world space
    const gunQuat = new THREE.Quaternion();
    this._gunGroup.getWorldQuaternion(gunQuat);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(gunQuat);
    // Flatten to ground plane
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) return;
    forward.normalize();

    // Bullet travels along ground plane (so it visually strafes zombies)
    const origin = new THREE.Vector3(muzzleWorld.x, 1.2, muzzleWorld.z);
    createProjectile(engine.entityManager, this._scene, origin, forward, 38, 4);

    // Muzzle flash at actual altitude
    if (engine.particleSystem) {
      engine.particleSystem.emit(muzzleWorld, forward, 3, {
        speed: 10, speedVariance: 3, spread: 0.25,
        life: 0.08, lifeVariance: 0.02,
        size: 0.22, sizeVariance: 0.06,
        startColor: 0xffffaa, endColor: 0xff6600,
      });
      engine.particleSystem.emitFlash(muzzleWorld, 0xffee44, 3, 0.05);
      // Shell casings ejecting to the left of the gun
      const leftX = -forward.z;
      const leftZ = forward.x;
      engine.particleSystem.emit(muzzleWorld, new THREE.Vector3(leftX, 0, leftZ), 1, {
        speed: 3, speedVariance: 1, spread: 0.2,
        life: 0.35, lifeVariance: 0.08,
        size: 0.1, sizeVariance: 0.04,
        startColor: 0xccaa22, endColor: 0x663311,
        ySpeed: -3,
      });
    }

    // Spin the barrel shroud visual
    const shroud = this._gunGroup && this._gunGroup.getObjectByName('gunshipShroud');
    if (shroud) shroud.rotation.z += 0.5;

    if (engine.audioSystem) engine.audioSystem.playGunshot();
  }

  _cleanup() {
    if (this._mesh) {
      this._scene.remove(this._mesh);
      this._mesh.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
      this._mesh = null;
    }
    this._gunGroup = null;
    this._phase = PHASES.DONE;
  }

  reset() {
    this._cleanup();
    this._phase = PHASES.IDLE;
    this._totalSwept = 0;
    this._gunAngle = GUN_REST_ANGLE;
  }

  _createGunshipModel() {
    const group = new THREE.Group();

    // Darker military-green body
    const body = VoxelBuilder.cube(0.9, 0.65, 2.2, 0x2a3a2a);
    group.add(body);

    // Tinted cockpit
    const cockpit = VoxelBuilder.cube(0.8, 0.45, 0.7, 0x224433);
    cockpit.position.set(0, 0.18, 1.0);
    group.add(cockpit);

    // Ammo belt feeding into gun mount — stays with fuselage, doesn't rotate
    const belt = VoxelBuilder.cube(0.1, 0.1, 0.35, 0x996633);
    belt.position.set(0.4, -0.05, 0.0);
    group.add(belt);

    // --- SIDE MINIGUN (in a rotating group) ---
    const gunGroup = new THREE.Group();
    gunGroup.name = 'gunshipGun';
    // Pivot point: right side of the helicopter
    gunGroup.position.set(0.55, -0.08, 0.05);

    // Compact gun mount (smaller than before)
    const gunMount = VoxelBuilder.cube(0.16, 0.2, 0.22, 0x222222);
    gunMount.position.set(0, 0, 0);
    gunGroup.add(gunMount);

    // Six-barrel minigun cluster — shorter barrels, tighter cluster
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const bx = Math.cos(a) * 0.035;
      const by = Math.sin(a) * 0.035;
      const barrel = VoxelBuilder.cube(0.03, 0.03, 0.45, 0x1a1a1a);
      barrel.position.set(bx, by, 0.28);
      gunGroup.add(barrel);
    }

    // Small barrel shroud
    const shroud = VoxelBuilder.cube(0.14, 0.14, 0.08, 0x2a2a2a);
    shroud.name = 'gunshipShroud';
    shroud.position.set(0, 0, 0.5);
    gunGroup.add(shroud);

    // Muzzle glow
    const muzzle = VoxelBuilder.cube(0.12, 0.12, 0.04, 0xff7722);
    muzzle.name = 'gunshipMuzzle';
    muzzle.position.set(0, 0, 0.56);
    gunGroup.add(muzzle);

    group.add(gunGroup);

    // Tail boom
    const tail = VoxelBuilder.cube(0.28, 0.28, 1.3, 0x2a3a2a);
    tail.position.set(0, 0.1, -1.6);
    group.add(tail);

    // Vertical stabilizer
    const fin = VoxelBuilder.cube(0.08, 0.55, 0.3, 0x2a3a2a);
    fin.position.set(0, 0.4, -2.1);
    group.add(fin);

    // Tail rotor (spins)
    const tailRotor = new THREE.Group();
    tailRotor.name = 'gunshipTailRotor';
    tailRotor.add(VoxelBuilder.cube(0.06, 0.6, 0.06, 0x444444));
    tailRotor.add(VoxelBuilder.cube(0.06, 0.06, 0.6, 0x444444));
    tailRotor.position.set(0.18, 0.25, -2.15);
    group.add(tailRotor);

    // Mast
    const mast = VoxelBuilder.cube(0.14, 0.35, 0.14, 0x333333);
    mast.position.y = 0.5;
    group.add(mast);

    // Main rotor (spins)
    const rotor = new THREE.Group();
    rotor.name = 'gunshipRotor';
    rotor.add(VoxelBuilder.cube(3.5, 0.05, 0.2, 0x333333));
    rotor.add(VoxelBuilder.cube(0.2, 0.05, 3.5, 0x333333));
    rotor.position.y = 0.72;
    group.add(rotor);

    // Skids
    const skidL = VoxelBuilder.cube(0.1, 0.1, 1.5, 0x222222);
    skidL.position.set(-0.4, -0.4, 0);
    group.add(skidL);
    const skidR = VoxelBuilder.cube(0.1, 0.1, 1.5, 0x222222);
    skidR.position.set(0.4, -0.4, 0);
    group.add(skidR);

    // Red navigation light
    const navLight = VoxelBuilder.cube(0.08, 0.08, 0.08, 0xff2222);
    navLight.material = new THREE.MeshLambertMaterial({
      color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 0.8,
    });
    navLight.position.set(0, 0.3, -2.3);
    group.add(navLight);

    // Searchlight
    const spotlight = new THREE.PointLight(0xffeeaa, 2.5, 14);
    spotlight.position.set(0, -0.4, 0.5);
    group.add(spotlight);

    return group;
  }
}
