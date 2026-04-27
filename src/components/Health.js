import { Component } from '../core/Component.js';

export class Health extends Component {
  static componentName = 'Health';

  constructor(current = 100, max = 100) {
    super();
    this.current = current;
    this.max = max;
  }

  get ratio() {
    return this.current / this.max;
  }

  takeDamage(amount) {
    this.current = Math.max(0, this.current - amount);
    return this.current <= 0;
  }

  heal(amount) {
    this.current = Math.min(this.max, this.current + amount);
  }
}
