import * as THREE from 'three';
import { VoxelBuilder } from './VoxelBuilder.js';

// MEGA TURRET — twin miniguns clustered in the middle, rocket pods on the flanks.
// Everything above the pedestal rotates as a single unit.
export function createMegaTurretModel() {
  const group = new THREE.Group();

  // Massive armored base
  const base = VoxelBuilder.cube(1.8, 0.5, 1.8, 0x444444);
  base.position.y = 0.25;
  group.add(base);

  const baseTrim = VoxelBuilder.cube(2.0, 0.15, 2.0, 0x2a2a2a);
  baseTrim.position.y = 0.08;
  group.add(baseTrim);

  // Heavy pedestal
  const pedestal = VoxelBuilder.cube(1.0, 0.8, 1.0, 0x6a6a6a);
  pedestal.position.y = 0.9;
  group.add(pedestal);

  // Rotating head group
  const head = new THREE.Group();
  head.name = 'turretHead';

  // Central command core (dark armored body) — wider to support side pods
  const core = VoxelBuilder.cube(1.8, 0.7, 0.9, 0x3a3a3a);
  core.position.y = 0;
  head.add(core);

  // Armor plating on front of core
  const frontArmor = VoxelBuilder.cube(1.6, 0.6, 0.2, 0x555555);
  frontArmor.position.set(0, 0, 0.55);
  head.add(frontArmor);

  // Central scope / antenna
  const scope = VoxelBuilder.cube(0.3, 0.3, 0.3, 0x222222);
  scope.position.set(0, 0.45, 0);
  head.add(scope);

  const antenna = VoxelBuilder.cube(0.08, 0.5, 0.08, 0x111111);
  antenna.position.set(0, 0.8, -0.1);
  head.add(antenna);

  // ---------- MINIGUNS (clustered tightly in the center) ----------
  for (const side of [-1, 1]) {
    const mgGroup = new THREE.Group();
    // Tight central placement
    mgGroup.position.set(0.22 * side, 0, 0.15);

    // Minigun housing
    const housing = VoxelBuilder.cube(0.34, 0.36, 0.5, 0x4a4a4a);
    housing.position.set(0, 0, 0.1);
    mgGroup.add(housing);

    // Multi-barrel cluster (6 mini barrels)
    const barrelColors = [0x2a2a2a, 0x333333, 0x242424];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const bx = Math.cos(a) * 0.08;
      const by = Math.sin(a) * 0.08;
      const barrel = VoxelBuilder.cube(0.045, 0.045, 0.85, barrelColors[i % 3]);
      barrel.position.set(bx, by, 0.65);
      mgGroup.add(barrel);
    }

    // Barrel shroud ring
    const shroud = VoxelBuilder.cube(0.28, 0.28, 0.12, 0x333333);
    shroud.position.set(0, 0, 1.08);
    mgGroup.add(shroud);

    // Muzzle tip (glowing)
    const tip = VoxelBuilder.cube(0.2, 0.2, 0.05, 0xffaa00);
    tip.name = side < 0 ? 'megaMuzzleL' : 'megaMuzzleR';
    tip.position.set(0, 0, 1.16);
    mgGroup.add(tip);

    head.add(mgGroup);
  }

  // Connector plate between miniguns (unified look)
  const mgPlate = VoxelBuilder.cube(0.6, 0.18, 0.35, 0x555555);
  mgPlate.position.set(0, 0.1, 0.2);
  head.add(mgPlate);

  // ---------- ROCKET PODS (mounted on the flanks, same horizontal plane) ----------
  for (const side of [-1, 1]) {
    const podGroup = new THREE.Group();
    // Far outboard on the sides
    podGroup.position.set(0.85 * side, 0, 0.05);

    // Pod housing — boxy launcher on the flank
    const pod = VoxelBuilder.cube(0.5, 0.5, 0.75, 0x553322);
    pod.position.set(0, 0, 0.1);
    podGroup.add(pod);

    // Mounting bracket that attaches pod to the core
    const bracket = VoxelBuilder.cube(0.22, 0.3, 0.3, 0x3a2a1a);
    bracket.position.set(-0.3 * side, 0, 0);
    podGroup.add(bracket);

    // Launch tubes — 2x2 grid of small rocket tubes on the front face
    const tubeColors = [0x222222, 0x2a1a0a];
    for (let ty = 0; ty < 2; ty++) {
      for (let tx = 0; tx < 2; tx++) {
        const tube = VoxelBuilder.cube(0.14, 0.14, 0.08, tubeColors[(tx + ty) % 2]);
        tube.position.set(
          (tx - 0.5) * 0.2,
          (ty - 0.5) * 0.2,
          0.5,
        );
        podGroup.add(tube);
      }
    }

    // Pod tip (slight glow, becomes firing indicator)
    const podTip = VoxelBuilder.cube(0.34, 0.34, 0.05, 0xff5522);
    podTip.name = side < 0 ? 'megaPodL' : 'megaPodR';
    podTip.position.set(0, 0, 0.54);
    podGroup.add(podTip);

    head.add(podGroup);
  }

  head.position.y = 1.55;
  group.add(head);

  // Red warning beacon on top
  const beacon = VoxelBuilder.cube(0.22, 0.2, 0.22, 0xff2222);
  beacon.material = new THREE.MeshLambertMaterial({
    color: 0xff2222,
    emissive: 0xff0000,
    emissiveIntensity: 0.8,
  });
  beacon.position.y = 2.55;
  group.add(beacon);

  return group;
}
