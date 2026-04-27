import * as THREE from 'three';
import { VoxelBuilder } from '../rendering/VoxelBuilder.js';

const FLIGHT_HEIGHT = 8;
const HOVER_HEIGHT = 4;

// Phases: approach → descend → hover (collect NPCs) → ascend → depart
const PHASES = {
  APPROACH: 0,  // fly toward NPCs
  DESCEND: 1,   // lower to hover height
  HOVER: 2,     // pause over NPCs, collect them
  ASCEND: 3,    // rise back up
  DEPART: 4,    // fly away
  DONE: 5,
};

export class HelicopterSystem {
  constructor(scene) {
    this._scene = scene;
    this._mesh = null;
    this._phase = PHASES.APPROACH;
    this._timer = 0;
    this._targetX = 12;
    this._targetZ = -8;
    this._startX = -35;
    this._startZ = -8;
    this._exitX = 40;
    this._exitZ = -15;
    this._posX = -35;
    this._posZ = -8;
    this._posY = FLIGHT_HEIGHT;
    this._collected = false;
    this._done = false;
  }

  start() {
    if (this._done) return;
    this._mesh = this._createHeliModel();
    this._mesh.position.set(this._startX, FLIGHT_HEIGHT, this._startZ);
    this._mesh.rotation.y = Math.PI / 2; // face right
    this._scene.add(this._mesh);
    this._phase = PHASES.APPROACH;
    this._timer = 0;
    this._posX = this._startX;
    this._posZ = this._startZ;
    this._posY = FLIGHT_HEIGHT;
    this._collected = false;
  }

  update(dt, engine) {
    if (this._done || !this._mesh) return;

    // Spin rotor always
    const rotor = this._mesh.getObjectByName('rotor');
    if (rotor) rotor.rotation.y += dt * 30;

    // Exhaust
    if (engine.particleSystem && Math.random() < 0.3) {
      engine.particleSystem.emit(
        new THREE.Vector3(this._posX, this._posY - 0.3, this._posZ),
        new THREE.Vector3(0, 0, 0), 1, {
          speed: 1, speedVariance: 0.5, spread: 0.3,
          life: 0.3, lifeVariance: 0.1, size: 0.25, sizeVariance: 0.08,
          startColor: 0x666666, endColor: 0x222222, ySpeed: -1,
        });
    }

    switch (this._phase) {
      case PHASES.APPROACH: {
        // Fly toward NPC position
        const dx = this._targetX - this._posX;
        const dz = this._targetZ - this._posZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const speed = 10;
        if (dist > 1) {
          this._posX += (dx / dist) * speed * dt;
          this._posZ += (dz / dist) * speed * dt;
          this._mesh.rotation.y = Math.atan2(dx, dz);
        } else {
          this._phase = PHASES.DESCEND;
          this._timer = 0;
        }
        break;
      }

      case PHASES.DESCEND: {
        // Lower to hover height
        this._posY -= 3 * dt;
        if (this._posY <= HOVER_HEIGHT) {
          this._posY = HOVER_HEIGHT;
          this._phase = PHASES.HOVER;
          this._timer = 0;
        }
        break;
      }

      case PHASES.HOVER: {
        // Hover for 3 seconds, collect NPCs at 1.5s
        this._timer += dt;

        // Slight hover wobble
        this._posY = HOVER_HEIGHT + Math.sin(this._timer * 3) * 0.1;

        // Collect NPCs at halfway point
        if (!this._collected && this._timer >= 1.5) {
          this._collected = true;
          const npcs = engine.entityManager.getEntitiesByTag('npc');
          for (const npc of npcs) {
            npc.destroy();
          }
          // Dust kick-up
          if (engine.particleSystem) {
            engine.particleSystem.emit(
              new THREE.Vector3(this._targetX, 0.5, this._targetZ),
              new THREE.Vector3(0, 0, 0), 12, {
                speed: 5, speedVariance: 3, spread: 2.0,
                life: 0.5, lifeVariance: 0.15,
                size: 0.4, sizeVariance: 0.15,
                startColor: 0x998866, endColor: 0x332211,
              });
          }
        }

        if (this._timer >= 3.0) {
          this._phase = PHASES.ASCEND;
          this._timer = 0;
        }
        break;
      }

      case PHASES.ASCEND: {
        this._posY += 3 * dt;
        if (this._posY >= FLIGHT_HEIGHT) {
          this._posY = FLIGHT_HEIGHT;
          this._phase = PHASES.DEPART;
          this._timer = 0;
        }
        break;
      }

      case PHASES.DEPART: {
        const dx = this._exitX - this._posX;
        const dz = this._exitZ - this._posZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const speed = 14;
        if (dist > 1) {
          this._posX += (dx / dist) * speed * dt;
          this._posZ += (dz / dist) * speed * dt;
          this._mesh.rotation.y = Math.atan2(dx, dz);
        } else {
          this._phase = PHASES.DONE;
          this._scene.remove(this._mesh);
          this._mesh.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
          this._mesh = null;
          this._done = true;
        }
        break;
      }
    }

    if (this._mesh) {
      this._mesh.position.set(this._posX, this._posY, this._posZ);
    }
  }

  _createHeliModel() {
    const group = new THREE.Group();
    const body = VoxelBuilder.cube(0.8, 0.6, 2.0, 0x445544);
    group.add(body);
    const cockpit = VoxelBuilder.cube(0.7, 0.4, 0.6, 0x88aacc);
    cockpit.position.set(0, 0.15, 0.9);
    group.add(cockpit);
    const tail = VoxelBuilder.cube(0.25, 0.25, 1.2, 0x556655);
    tail.position.set(0, 0.1, -1.5);
    group.add(tail);
    const fin = VoxelBuilder.cube(0.08, 0.5, 0.3, 0x556655);
    fin.position.set(0, 0.35, -2.0);
    group.add(fin);
    const mast = VoxelBuilder.cube(0.12, 0.3, 0.12, 0x444444);
    mast.position.y = 0.45;
    group.add(mast);
    const rotor = new THREE.Group();
    rotor.name = 'rotor';
    rotor.add(VoxelBuilder.cube(3.0, 0.04, 0.15, 0x555555));
    rotor.add(VoxelBuilder.cube(0.15, 0.04, 3.0, 0x555555));
    rotor.position.y = 0.65;
    group.add(rotor);
    const skidL = VoxelBuilder.cube(0.08, 0.08, 1.4, 0x444444);
    skidL.position.set(-0.35, -0.35, 0);
    group.add(skidL);
    const skidR = VoxelBuilder.cube(0.08, 0.08, 1.4, 0x444444);
    skidR.position.set(0.35, -0.35, 0);
    group.add(skidR);
    const spotlight = new THREE.PointLight(0xffffcc, 3, 12);
    spotlight.position.y = -0.4;
    group.add(spotlight);
    return group;
  }

  reset() {
    if (this._mesh) {
      this._scene.remove(this._mesh);
      this._mesh = null;
    }
    this._done = false;
    this._phase = PHASES.APPROACH;
    this._collected = false;
  }
}
