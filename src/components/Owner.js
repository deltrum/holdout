import { Component } from '../core/Component.js';

export class Owner extends Component {
  static componentName = 'Owner';

  constructor(playerIndex = 0) {
    super();
    this.playerIndex = playerIndex; // 0 = turret/mine/system, 1 = P1, 2 = P2
  }
}
