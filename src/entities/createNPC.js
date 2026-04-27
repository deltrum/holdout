import * as THREE from 'three';
import { Transform } from '../components/Transform.js';
import { Health } from '../components/Health.js';
import { Collider } from '../components/Collider.js';
import { MeshRef } from '../components/MeshRef.js';
import { TurretAI } from '../components/TurretAI.js';
import { VoxelBuilder } from '../rendering/VoxelBuilder.js';
import { createBarricade } from './createBarricade.js';

const NPC_COLORS = [
  { body: 0x559955, dark: 0x447744, legs: 0x335533, skin: 0xeebb99 },
  { body: 0x995599, dark: 0x774477, legs: 0x553355, skin: 0xeebb99 },
  { body: 0x998855, dark: 0x776644, legs: 0x554433, skin: 0xeebb99 },
];

function createNPCModel(colorIdx) {
  const c = NPC_COLORS[colorIdx % NPC_COLORS.length];
  return VoxelBuilder.buildCharacter([
    { name: 'body', size: [0.55, 0.75, 0.38], offset: [0, 0.88, 0], color: c.body },
    { name: 'head', size: [0.45, 0.45, 0.45], offset: [0, 1.48, 0], color: c.skin },
    { name: 'leftArm', size: [0.18, 0.55, 0.18], offset: [-0.37, 0.88, 0], color: c.dark },
    { name: 'rightArm', size: [0.18, 0.55, 0.18], offset: [0.37, 0.88, 0], color: c.dark },
    { name: 'leftLeg', size: [0.22, 0.45, 0.22], offset: [-0.14, 0.23, 0], color: c.legs },
    { name: 'rightLeg', size: [0.22, 0.45, 0.22], offset: [0.14, 0.23, 0], color: c.legs },
    { name: 'gun', size: [0.08, 0.08, 0.5], offset: [0.37, 0.82, 0.3], color: 0x333333 },
  ]);
}

export function createNPCGroup(entityManager, scene, center) {
  const npcs = [];

  // Barricade ring around the group
  const barricadeCount = 6;
  for (let i = 0; i < barricadeCount; i++) {
    const angle = (i / barricadeCount) * Math.PI * 2;
    const r = 2.5;
    createBarricade(entityManager, scene, {
      x: center.x + Math.cos(angle) * r,
      z: center.z + Math.sin(angle) * r,
    });
  }

  // NPCs inside the barricade ring
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const x = center.x + Math.cos(angle) * 1.0;
    const z = center.z + Math.sin(angle) * 1.0;

    const mesh = createNPCModel(i);
    scene.add(mesh);

    const npc = entityManager.createEntity()
      .addTag('npc')
      .addTag('player')  // zombies target them
      .addTag('turret')  // so turret shooting logic handles them
      .addComponent(new Transform(new THREE.Vector3(x, 0, z), 0))
      .addComponent(new Health(50, 50))
      .addComponent(new Collider(0.45, 'player', true))
      .addComponent(new TurretAI(10, 0.6, 5, 18, 'gun'))  // range 10, fire every 0.6s
      .addComponent(new MeshRef(mesh));

    npcs.push(npc);
  }
  return npcs;
}
