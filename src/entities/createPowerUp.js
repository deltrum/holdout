import * as THREE from 'three';
import { Transform } from '../components/Transform.js';
import { MeshRef } from '../components/MeshRef.js';
import { PowerUp, POWERUP_TYPES } from '../components/PowerUp.js';

export function createPowerUp(entityManager, scene, position, type) {
  const config = POWERUP_TYPES[type];

  const group = new THREE.Group();

  // Glowing cube
  const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const mat = new THREE.MeshBasicMaterial({ color: config.color, fog: false, transparent: true, opacity: 0.9 });
  const cube = new THREE.Mesh(geo, mat);
  group.add(cube);

  // Inner glow (smaller bright core)
  const coreGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
  const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.6 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  // Point light
  const light = new THREE.PointLight(config.color, 2, 5);
  light.position.y = 0.5;
  group.add(light);

  group.position.y = 1.2;
  scene.add(group);

  return entityManager.createEntity()
    .addTag('powerup')
    .addComponent(new Transform(new THREE.Vector3(position.x, 0, position.z), 0))
    .addComponent(new PowerUp(type))
    .addComponent(new MeshRef(group));
}
