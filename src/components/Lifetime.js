import { Component } from '../core/Component.js';

export class Lifetime extends Component {
  static componentName = 'Lifetime';

  constructor(remaining = 2.0) {
    super();
    this.remaining = remaining;
  }
}
