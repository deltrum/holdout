import { Component } from '../core/Component.js';

export class Damage extends Component {
  static componentName = 'Damage';

  constructor(value = 5) {
    super();
    this.value = value;
  }
}
