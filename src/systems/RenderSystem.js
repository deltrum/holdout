import * as THREE from 'three';
import { CONFIG } from '../config/gameConfig.js';
import { createGroundPlane } from '../rendering/GroundPlane.js';
import { lerp } from '../utils/math.js';

export class RenderSystem {
  constructor(canvas) {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x1a1a2e);

    // Scene
    this.scene = new THREE.Scene();

    // Orthographic camera
    const aspect = window.innerWidth / window.innerHeight;
    const fw = CONFIG.camera.frustumWidth / 2;
    this.camera = new THREE.OrthographicCamera(
      -fw * aspect, fw * aspect, fw, -fw, 0.1, 200,
    );
    this.camera.position.set(0, CONFIG.camera.height, 0);
    this.camera.lookAt(0, 0, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffeedd, 0.5);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x8888cc, 0x445522, 0.3);
    this.scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 60;
    this.scene.add(dirLight);
    this._dirLight = dirLight;

    // Ground
    this.groundPlane = createGroundPlane();
    this.scene.add(this.groundPlane);

    // Resize handler
    this._onResize = () => {
      const a = window.innerWidth / window.innerHeight;
      this.camera.left = -fw * a;
      this.camera.right = fw * a;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', this._onResize);
  }

  update(dt, entityManager) {
    // Sync entity transforms to meshes
    for (const entity of entityManager.getEntitiesWith('Transform', 'MeshRef')) {
      const transform = entity.getComponent('Transform');
      const meshRef = entity.getComponent('MeshRef');
      if (meshRef.mesh) {
        meshRef.mesh.position.x = transform.position.x;
        meshRef.mesh.position.z = transform.position.z;
        // Turrets handle head rotation separately — NPCs rotate whole body
        if (!entity.hasTag('turret') || entity.hasTag('npc')) {
          meshRef.mesh.rotation.y = transform.rotation;
        }

        // Simple bobbing animation for zombies
        if (entity.hasTag('zombie')) {
          meshRef.mesh.position.y = Math.sin(Date.now() * 0.005 + entity.id) * 0.05;
        }
      }
    }

    // Camera follows midpoint of all alive players
    const players = entityManager.getEntitiesByTag('player');
    if (players.length > 0) {
      let targetX = 0, targetZ = 0, count = 0;
      for (const p of players) {
        if (!p.alive) continue;
        const pos = p.getComponent('Transform').position;
        targetX += pos.x;
        targetZ += pos.z;
        count++;
      }
      if (count > 0) {
        targetX /= count;
        targetZ /= count;
      }

      const speed = CONFIG.camera.followSpeed;
      this.camera.position.x = lerp(this.camera.position.x, targetX, speed * dt);
      this.camera.position.z = lerp(this.camera.position.z, targetZ, speed * dt);

      this._dirLight.position.x = this.camera.position.x + 10;
      this._dirLight.position.z = this.camera.position.z + 10;
      this._dirLight.target.position.set(this.camera.position.x, 0, this.camera.position.z);
      this._dirLight.target.updateMatrixWorld();
    }

    // Clean up dead entities
    entityManager.cleanup(this.scene);

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }
}
