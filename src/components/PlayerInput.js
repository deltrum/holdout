import { Component } from '../core/Component.js';

export class PlayerInput extends Component {
  static componentName = 'PlayerInput';

  constructor(playerIndex = 1) {
    super();
    this.playerIndex = playerIndex; // 1 or 2
  }
}
