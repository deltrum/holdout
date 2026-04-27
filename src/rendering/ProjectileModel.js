import * as THREE from 'three';

const _bulletGeo = new THREE.BoxGeometry(0.15, 0.15, 0.3);

export function createProjectileModel() {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xff2200,
    fog: false,
  });
  const mesh = new THREE.Mesh(_bulletGeo, mat);
  mesh.position.y = 0.85;
  return mesh;
}
