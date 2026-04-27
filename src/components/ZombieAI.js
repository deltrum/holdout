import { Component } from '../core/Component.js';

export class ZombieAI extends Component {
  static componentName = 'ZombieAI';

  constructor(attackRange = 1.2, attackDamage = 10, attackCooldown = 1.0, maneuver = false) {
    super();
    this.state = 'moving'; // 'moving' | 'attacking'
    this.attackRange = attackRange;
    this.attackDamage = attackDamage;
    this.attackCooldown = attackCooldown;
    this.lastAttack = -Infinity;
    this.targetTag = 'base'; // default target

    // Maneuver: zigzag movement instead of straight line
    this.maneuver = maneuver;
    this.maneuverPhase = Math.random() * Math.PI * 2; // random start offset
    this.maneuverFreq = 2.5 + Math.random() * 1.5;   // how fast they zigzag (2.5-4 Hz)
    this.maneuverAmp = 0.6 + Math.random() * 0.4;    // how wide they zigzag (0.6-1.0)
  }
}
