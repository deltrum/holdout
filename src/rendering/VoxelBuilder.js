import * as THREE from 'three';

const _matCache = new Map();

function getCachedMaterial(color) {
  if (!_matCache.has(color)) {
    _matCache.set(color, new THREE.MeshLambertMaterial({ color }));
  }
  return _matCache.get(color);
}

export class VoxelBuilder {
  static cube(width, height, depth, color) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geo, getCachedMaterial(color));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  static buildCharacter(parts) {
    const group = new THREE.Group();
    for (const part of parts) {
      const mesh = VoxelBuilder.cube(part.size[0], part.size[1], part.size[2], part.color);
      mesh.position.set(part.offset[0], part.offset[1], part.offset[2]);
      mesh.name = part.name;
      group.add(mesh);
    }
    return group;
  }
}
