import { Component } from '../core/Component.js';

export class Rocket extends Component {
  static componentName = 'Rocket';

  constructor(explosionRadius = 3, explosionDamage = 25) {
    super();
    this.explosionRadius = explosionRadius;
    this.explosionDamage = explosionDamage;
  }
}
