import * as THREE from 'three';

const _rocketGeo = new THREE.BoxGeometry(0.22, 0.22, 0.55);

export function createRocketModel() {
  const group = new THREE.Group();

  // Rocket body — bright orange, self-lit (not affected by fog)
  const body = new THREE.Mesh(
    _rocketGeo,
    new THREE.MeshBasicMaterial({ color: 0xff5500, fog: false }),
  );
  body.name = 'rocketBody';
  group.add(body);

  // Yellow nose cone
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.14, 0.18),
    new THREE.MeshBasicMaterial({ color: 0xffdd22, fog: false }),
  );
  nose.position.z = 0.32;
  group.add(nose);

  // Fins — 4 cross fins at the back
  const finGeo = new THREE.BoxGeometry(0.04, 0.18, 0.18);
  const finMat = new THREE.MeshBasicMaterial({ color: 0x992200, fog: false });
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(finGeo, finMat);
    fin.position.z = -0.2;
    fin.rotation.z = (i / 4) * Math.PI * 2;
    group.add(fin);
  }

  // Glowing tail exhaust (inner hot core)
  const exhaustCore = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 0.2),
    new THREE.MeshBasicMaterial({ color: 0xffff88, fog: false, transparent: true, opacity: 0.9 }),
  );
  exhaustCore.name = 'rocketExhaust';
  exhaustCore.position.z = -0.35;
  group.add(exhaustCore);

  // Exhaust flame trail
  const flameTrail = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.28, 0.45),
    new THREE.MeshBasicMaterial({ color: 0xff8822, fog: false, transparent: true, opacity: 0.6 }),
  );
  flameTrail.name = 'rocketFlame';
  flameTrail.position.z = -0.55;
  group.add(flameTrail);

  // Bright point light for area glow
  const trail = new THREE.PointLight(0xff6600, 1.3, 3.5);
  trail.position.z = -0.3;
  group.add(trail);

  group.position.y = 1.15;
  return group;
}
