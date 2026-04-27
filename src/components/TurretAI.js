import { Component } from '../core/Component.js';

export class TurretAI extends Component {
  static componentName = 'TurretAI';

  constructor(range = 12, fireRate = 0.4, damage = 6, projectileSpeed = 18, weaponType = 'gun') {
    super();
    this.range = range;
    this.fireRate = fireRate;
    this.damage = damage;
    this.projectileSpeed = projectileSpeed;
    this.lastFired = -Infinity;
    this.targetId = null;
    this.weaponType = weaponType;
    this.currentAngle = 0;   // current facing angle (lerped)
    this.turnSpeed = 4;      // radians per second

    // Secondary weapon (used by mega turret: rockets fire on slower cooldown)
    this.lastFiredSecondary = -Infinity;
    this.secondaryFireRate = 2.0;
    this.secondaryDamage = 15;
    // Alternating fire toggle (for dual barrels on mega turret)
    this.altFire = 0;
  }
}
