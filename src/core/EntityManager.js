import { Entity } from './Entity.js';

export class EntityManager {
  constructor() {
    this.entities = new Map();
    this._nextId = 1;
  }

  createEntity() {
    const entity = new Entity(this._nextId++);
    this.entities.set(entity.id, entity);
    return entity;
  }

  destroyEntity(id) {
    const entity = this.entities.get(id);
    if (entity) {
      entity.alive = false;
    }
  }

  getEntitiesWith(...componentNames) {
    const results = [];
    for (const entity of this.entities.values()) {
      if (!entity.alive) continue;
      let hasAll = true;
      for (const name of componentNames) {
        if (!entity.hasComponent(name)) {
          hasAll = false;
          break;
        }
      }
      if (hasAll) results.push(entity);
    }
    return results;
  }

  getEntitiesByTag(tag) {
    const results = [];
    for (const entity of this.entities.values()) {
      if (entity.alive && entity.hasTag(tag)) {
        results.push(entity);
      }
    }
    return results;
  }

  cleanup(scene) {
    const toRemove = [];
    for (const [id, entity] of this.entities) {
      if (!entity.alive) {
        toRemove.push(id);
        const meshRef = entity.getComponent('MeshRef');
        if (meshRef && meshRef.mesh) {
          scene.remove(meshRef.mesh);
          meshRef.mesh.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((m) => m.dispose());
              } else {
                child.material.dispose();
              }
            }
          });
        }
      }
    }
    for (const id of toRemove) {
      this.entities.delete(id);
    }
    return toRemove.length;
  }

  clear(scene) {
    for (const entity of this.entities.values()) {
      entity.alive = false;
    }
    this.cleanup(scene);
  }
}
