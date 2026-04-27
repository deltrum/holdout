import { Component } from '../core/Component.js';

export class Mine extends Component {
  static componentName = 'Mine';

  constructor(explosionRadius = 4, explosionDamage = 50, triggerRadius = 1.5) {
    super();
    this.explosionRadius = explosionRadius;
    this.explosionDamage = explosionDamage;
    this.triggerRadius = triggerRadius;
    this.armed = true;
  }
}
