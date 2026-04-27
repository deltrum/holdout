import * as THREE from 'three';

const MAX_BLOOD = 80;
const BLOOD_LIFETIME = 30; // seconds

export class EnvironmentSystem {
  constructor(scene) {
    this._scene = scene;
    this._bloodSplatters = [];
    this._fireBarrels = [];
    this._emergencyLights = [];
    this.treePositions = []; // exposed for spawn system

    // Shared blood geometry
    this._bloodGeo = new THREE.PlaneGeometry(1, 1);
    this._bloodGeo.rotateX(-Math.PI / 2);
  }

  // --- Blood splatters ---

  addBloodSplatter(x, z) {
    if (this._bloodSplatters.length >= MAX_BLOOD) {
      // Remove oldest
      const old = this._bloodSplatters.shift();
      this._scene.remove(old.mesh);
      old.mesh.geometry.dispose();
      old.mesh.material.dispose();
    }

    // Build a splatter from multiple overlapping patches
    const group = new THREE.Group();
    const colors = [0x770011, 0x880000, 0x660011, 0x550000, 0x990011];
    const patchCount = 4 + Math.floor(Math.random() * 4); // 4-7 patches

    for (let i = 0; i < patchCount; i++) {
      const pSize = 0.3 + Math.random() * 0.5;
      const px = (Math.random() - 0.5) * 0.8;
      const pz = (Math.random() - 0.5) * 0.8;
      const geo = new THREE.CircleGeometry(pSize, 6 + Math.floor(Math.random() * 3));
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0.6 + Math.random() * 0.25,
        depthWrite: false,
        fog: false,
        side: THREE.DoubleSide,
      });
      const patch = new THREE.Mesh(geo, mat);
      patch.position.set(px, 0, pz);
      patch.rotation.y = Math.random() * Math.PI * 2;
      group.add(patch);
    }

    group.position.set(x, 0.03, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    this._scene.add(group);

    this._bloodSplatters.push({ mesh: group, life: BLOOD_LIFETIME });
  }

  // --- Fire barrels ---

  addFireBarrel(x, z) {
    const group = new THREE.Group();

    // Barrel body
    const barrelGeo = new THREE.BoxGeometry(0.6, 0.9, 0.6);
    const barrelMat = new THREE.MeshLambertMaterial({ color: 0x664422 });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.position.y = 0.45;
    barrel.castShadow = true;
    group.add(barrel);

    // Metal ring
    const ringGeo = new THREE.BoxGeometry(0.65, 0.08, 0.65);
    const ringMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.position.y = 0.2;
    group.add(ring1);
    const ring2 = ring1.clone();
    ring2.position.y = 0.7;
    group.add(ring2);

    // Fire light
    const light = new THREE.PointLight(0xff6622, 2, 8);
    light.position.y = 1.2;
    group.add(light);

    group.position.set(x, 0, z);
    this._scene.add(group);

    this._fireBarrels.push({
      group,
      light,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // --- Emergency lights ---

  addEmergencyLight(x, z) {
    const group = new THREE.Group();

    // Pole
    const poleGeo = new THREE.BoxGeometry(0.15, 2.5, 0.15);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 1.25;
    group.add(pole);

    // Light housing
    const housingGeo = new THREE.BoxGeometry(0.3, 0.2, 0.3);
    const housingMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const housing = new THREE.Mesh(housingGeo, housingMat);
    housing.position.y = 2.6;
    group.add(housing);

    // Red light
    const redLight = new THREE.PointLight(0xff0000, 0, 10);
    redLight.position.y = 2.7;
    group.add(redLight);

    // Blue light
    const blueLight = new THREE.PointLight(0x0044ff, 0, 10);
    blueLight.position.y = 2.7;
    group.add(blueLight);

    // Glowing bulb (visual)
    const bulbGeo = new THREE.BoxGeometry(0.2, 0.15, 0.2);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xff0000, fog: false });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.y = 2.75;
    bulb.name = 'bulb';
    group.add(bulb);

    group.position.set(x, 0, z);
    this._scene.add(group);

    this._emergencyLights.push({
      group,
      redLight,
      blueLight,
      bulb,
      bulbMat,
      phase: Math.random() * Math.PI * 2,
    });
  }

  // --- Debris ---

  plantForest(innerRadius = 16, outerRadius = 27, count = 80) {
    // Plant trees in a ring around the map between innerRadius and outerRadius
    this.treePositions.length = 0;
    const placed = [];

    for (let i = 0; i < count; i++) {
      // Random angle, random radius in the ring
      const angle = Math.random() * Math.PI * 2;
      const r = innerRadius + Math.random() * (outerRadius - innerRadius);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      // Minimum spacing between trees
      let tooClose = false;
      for (const p of placed) {
        const dx = p.x - x;
        const dz = p.z - z;
        if (dx * dx + dz * dz < 4) { tooClose = true; break; } // min 2 units apart
      }
      if (tooClose) continue;

      placed.push({ x, z });
      this.treePositions.push({ x, z });
      this._createTree(x, z);
    }
  }

  _createTree(x, z) {
    const group = new THREE.Group();
    const treeType = Math.random();

    if (treeType < 0.5) {
      // Pine tree — cone canopy layers
      const trunkH = 1.8 + Math.random() * 1.2;
      const trunkW = 0.15 + Math.random() * 0.08;
      const trunkGeo = new THREE.CylinderGeometry(trunkW * 0.6, trunkW, trunkH, 5);
      const trunkMat = new THREE.MeshBasicMaterial({ color: 0x664433, fog: false });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      group.add(trunk);

      // 3 cone layers stacked, getting smaller
      const g = 90 + Math.floor(Math.random() * 15); // green 90-105
      for (let j = 0; j < 3; j++) {
        const coneR = (1.3 - j * 0.35) * (0.8 + Math.random() * 0.4);
        const coneH = 1.0 + Math.random() * 0.4;
        const coneGeo = new THREE.ConeGeometry(coneR, coneH, 6);
        const shade = (22 + j * 2) << 16 | (g - j * 4) << 8 | (18 + j * 2);
        const coneMat = new THREE.MeshBasicMaterial({ color: shade, fog: false });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.y = trunkH + j * 0.7 + 0.3;
        cone.rotation.y = Math.random() * Math.PI;
        cone.castShadow = true;
        group.add(cone);
      }
    } else {
      // Round/bushy tree — sphere-ish canopy from multiple spheres
      const trunkH = 1.2 + Math.random() * 1.0;
      const trunkW = 0.12 + Math.random() * 0.06;
      const trunkGeo = new THREE.CylinderGeometry(trunkW * 0.7, trunkW, trunkH, 5);
      const trunkMat = new THREE.MeshBasicMaterial({ color: 0x775533, fog: false });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = true;
      group.add(trunk);

      // Bushy canopy: 3-4 overlapping spheres
      const g2 = 90 + Math.floor(Math.random() * 15); // green 90-105
      const bushCount = 3 + Math.floor(Math.random() * 2);
      for (let j = 0; j < bushCount; j++) {
        const r = 0.6 + Math.random() * 0.4;
        const bushGeo = new THREE.SphereGeometry(r, 5, 4);
        const shade = (22 + j * 2) << 16 | (g2 - j * 3) << 8 | (18 + j * 2);
        const bushMat = new THREE.MeshBasicMaterial({ color: shade, fog: false });
        const bush = new THREE.Mesh(bushGeo, bushMat);
        bush.position.set(
          (Math.random() - 0.5) * 0.5,
          trunkH + 0.3 + Math.random() * 0.4,
          (Math.random() - 0.5) * 0.5,
        );
        bush.castShadow = true;
        group.add(bush);
      }
    }

    // Slight random lean
    group.rotation.x = (Math.random() - 0.5) * 0.08;
    group.rotation.z = (Math.random() - 0.5) * 0.08;
    group.position.set(x, 0, z);
    this._scene.add(group);
  }

  scatterDebris(count = 25) {
    const colors = [0x554433, 0x665544, 0x443322, 0x776655, 0x333333, 0x555555];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 50;
      const z = (Math.random() - 0.5) * 50;

      // Skip if too close to base center
      if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;

      const w = 0.2 + Math.random() * 0.6;
      const h = 0.1 + Math.random() * 0.3;
      const d = 0.2 + Math.random() * 0.6;
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshLambertMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, h / 2, z);
      mesh.rotation.y = Math.random() * Math.PI;
      mesh.rotation.z = (Math.random() - 0.5) * 0.3;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this._scene.add(mesh);
    }
  }

  // --- Update loop ---

  update(dt, particleSystem) {
    // Blood fade
    for (let i = this._bloodSplatters.length - 1; i >= 0; i--) {
      const b = this._bloodSplatters[i];
      b.life -= dt;
      if (b.life <= 0) {
        this._scene.remove(b.mesh);
        b.mesh.traverse(c => { if (c.material) c.material.dispose(); if (c.geometry) c.geometry.dispose(); });
        this._bloodSplatters.splice(i, 1);
      } else if (b.life < 5) {
        const alpha = (b.life / 5);
        b.mesh.traverse(c => { if (c.material) c.material.opacity = alpha * 0.7; });
      }
    }

    // Fire barrels — flickering light + fire particles
    for (const fb of this._fireBarrels) {
      fb.phase += dt * 8;
      const flicker = 1.5 + Math.sin(fb.phase) * 0.5 + Math.sin(fb.phase * 3.7) * 0.3;
      fb.light.intensity = flicker;

      // Fire particles
      if (particleSystem && Math.random() < 0.3) {
        const pos = fb.group.position;
        particleSystem.emit(
          new THREE.Vector3(pos.x, 1.1, pos.z),
          new THREE.Vector3(0, 0, 0), 1, {
            speed: 2, speedVariance: 1, spread: 0.3,
            life: 0.3, lifeVariance: 0.1,
            size: 0.25, sizeVariance: 0.1,
            startColor: 0xff8800, endColor: 0x441100,
            ySpeed: 2,
          });
      }
      // Smoke
      if (particleSystem && Math.random() < 0.1) {
        const pos = fb.group.position;
        particleSystem.emit(
          new THREE.Vector3(pos.x, 1.3, pos.z),
          new THREE.Vector3(0, 0, 0), 1, {
            speed: 1, speedVariance: 0.5, spread: 0.4,
            life: 0.6, lifeVariance: 0.2,
            size: 0.3, sizeVariance: 0.1,
            startColor: 0x444444, endColor: 0x111111,
            ySpeed: 1.5,
          });
      }
    }

    // Emergency lights — alternating red/blue flash
    for (const el of this._emergencyLights) {
      el.phase += dt * 4;
      const cycle = Math.sin(el.phase);
      if (cycle > 0) {
        el.redLight.intensity = cycle * 3;
        el.blueLight.intensity = 0;
        el.bulbMat.color.setHex(0xff0000);
      } else {
        el.redLight.intensity = 0;
        el.blueLight.intensity = -cycle * 3;
        el.bulbMat.color.setHex(0x0044ff);
      }
    }
  }

  clear() {
    for (const b of this._bloodSplatters) {
      this._scene.remove(b.mesh);
      b.mesh.traverse(c => { if (c.material) c.material.dispose(); if (c.geometry) c.geometry.dispose(); });
    }
    this._bloodSplatters.length = 0;
  }
}
