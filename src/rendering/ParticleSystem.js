import * as THREE from 'three';

const MAX_PARTICLES = 500;

export class ParticleSystem {
  constructor(scene) {
    this._particles = [];
    this._scene = scene;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this._particles.push({
        active: false,
        mesh: null,
        vx: 0, vy: 0, vz: 0,
        life: 0, maxLife: 0,
        startSize: 0,
        startColor: new THREE.Color(),
        endColor: new THREE.Color(),
      });
    }

    this._geo = new THREE.BoxGeometry(1, 1, 1);
    this._lights = [];
  }

  emit(position, direction, count, config) {
    const {
      speed = 5,
      speedVariance = 2,
      spread = 0.5,
      life = 0.2,
      lifeVariance = 0.05,
      size = 0.4,
      sizeVariance = 0.1,
      startColor = 0xff8800,
      endColor = 0x330000,
      ySpeed = 0,
    } = config;

    const startCol = new THREE.Color(startColor);
    const endCol = new THREE.Color(endColor);

    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES && spawned < count; i++) {
      const p = this._particles[i];
      if (p.active) continue;

      p.active = true;
      p.life = life + (Math.random() - 0.5) * 2 * lifeVariance;
      p.maxLife = p.life;
      p.startSize = size + (Math.random() - 0.5) * 2 * sizeVariance;
      p.startColor.copy(startCol);
      p.endColor.copy(endCol);

      // Velocity spread on XZ plane (visible from top-down)
      const s = speed + (Math.random() - 0.5) * 2 * speedVariance;
      const rx = (Math.random() - 0.5) * spread;
      const rz = (Math.random() - 0.5) * spread;
      p.vx = (direction.x + rx) * s;
      p.vy = ySpeed + Math.random() * 0.5;
      p.vz = (direction.z + rz) * s;

      if (!p.mesh) {
        const mat = new THREE.MeshBasicMaterial({
          color: startColor,
          transparent: true,
          depthWrite: false,
          fog: false,
        });
        p.mesh = new THREE.Mesh(this._geo, mat);
      }
      p.mesh.material.color.copy(startCol);
      p.mesh.material.opacity = 1;
      // Position slightly above ground so it's visible
      p.mesh.position.set(position.x, 1.0, position.z);
      p.mesh.scale.setScalar(p.startSize);
      p.mesh.visible = true;

      if (!p.mesh.parent) {
        this._scene.add(p.mesh);
      }

      spawned++;
    }
  }

  emitFlash(position, color, intensity, duration) {
    const light = new THREE.PointLight(color, intensity, 18);
    light.position.set(position.x, 4, position.z);
    this._scene.add(light);
    this._lights.push({ light, life: duration, maxLife: duration, startIntensity: intensity });
  }

  update(dt) {
    const tmpColor = new THREE.Color();

    for (const p of this._particles) {
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        if (p.mesh) p.mesh.visible = false;
        continue;
      }

      // Move on XZ plane
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      // Interpolate color and size
      const t = 1 - (p.life / p.maxLife);
      tmpColor.copy(p.startColor).lerp(p.endColor, t);
      p.mesh.material.color.copy(tmpColor);
      p.mesh.material.opacity = 1 - t * t;
      p.mesh.scale.setScalar(p.startSize * (1 - t * 0.5));

      p.mesh.rotation.y += dt * 8;
    }

    // Update lights — smooth fade over full duration
    for (let i = this._lights.length - 1; i >= 0; i--) {
      const l = this._lights[i];
      l.life -= dt;
      if (l.life <= 0) {
        this._scene.remove(l.light);
        l.light.dispose();
        this._lights.splice(i, 1);
      } else {
        const t = l.life / l.maxLife; // 1 at start, 0 at end
        l.light.intensity = l.startIntensity * t;
      }
    }
  }

  clear() {
    for (const p of this._particles) {
      p.active = false;
      if (p.mesh) p.mesh.visible = false;
    }
    for (const l of this._lights) {
      this._scene.remove(l.light);
      l.light.dispose();
    }
    this._lights.length = 0;
  }
}
