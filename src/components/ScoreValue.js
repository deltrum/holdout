import { Component } from '../core/Component.js';

export class ScoreValue extends Component {
  static componentName = 'ScoreValue';

  constructor(points = 10) {
    super();
    this.points = points;
  }
}
