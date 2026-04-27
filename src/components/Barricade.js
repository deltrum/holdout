import { Component } from '../core/Component.js';

export class Barricade extends Component {
  static componentName = 'Barricade';

  constructor(health = 60) {
    super();
    // empty — health is on the Health component
  }
}
