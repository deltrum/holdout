import { Component } from '../core/Component.js';

export class MortarStrike extends Component {
  static componentName = 'MortarStrike';

  constructor(targetX, targetZ, flightTime, damage, radius) {
    super();
    this.targetX = targetX;
    this.targetZ = targetZ;
    this.flightTime = flightTime;
    this.timer = flightTime;
    this.damage = damage;
    this.radius = radius;
    this.warningMesh = null; // set externally
  }
}
