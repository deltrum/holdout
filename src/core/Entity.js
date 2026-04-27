export class Entity {
  constructor(id) {
    this.id = id;
    this.components = new Map();
    this.tags = new Set();
    this.alive = true;
  }

  addComponent(component) {
    this.components.set(component.constructor.componentName, component);
    return this;
  }

  getComponent(name) {
    return this.components.get(name);
  }

  hasComponent(name) {
    return this.components.has(name);
  }

  removeComponent(name) {
    this.components.delete(name);
    return this;
  }

  addTag(tag) {
    this.tags.add(tag);
    return this;
  }

  hasTag(tag) {
    return this.tags.has(tag);
  }

  destroy() {
    this.alive = false;
  }
}
