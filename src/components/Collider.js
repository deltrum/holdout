import { Component } from '../core/Component.js';

export class Collider extends Component {
  static componentName = 'Collider';

  constructor(radius = 0.5, layer = 'default', isStatic = false) {
    super();
    this.radius = radius;
    this.layer = layer;
    this.isStatic = isStatic;
  }
}
