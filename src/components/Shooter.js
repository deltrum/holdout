import { Component } from '../core/Component.js';

export class Shooter extends Component {
  static componentName = 'Shooter';

  constructor(fireRate = 0.15, projectileSpeed = 20, damage = 5, maxAmmo = 30, reloadTime = 1.5) {
    super();
    this.fireRate = fireRate;
    this.projectileSpeed = projectileSpeed;
    this.damage = damage;
    this.lastFired = -Infinity;
    this.ammo = maxAmmo;
    this.maxAmmo = maxAmmo;
    this.reloadTime = reloadTime;
    this.reloading = false;
    this.reloadTimer = 0;

    // Weapon system
    this.weaponType = 'gun';
    this.ownedWeapons = ['gun']; // weapons this player has purchased

    // Store base gun stats for switching back
    this._baseStats = { fireRate, projectileSpeed, damage, maxAmmo, reloadTime };
  }

  switchWeapon(type, config) {
    this.weaponType = type;
    this.fireRate = config.fireRate;
    this.damage = config.damage;
    this.projectileSpeed = config.projectileSpeed;
    if (config.usesAmmo) {
      this.maxAmmo = config.maxAmmo;
      this.ammo = config.maxAmmo;
      this.reloadTime = config.reloadTime;
      this.reloading = false;
    } else {
      this.maxAmmo = 0;
      this.ammo = 0;
      this.reloading = false;
    }
    this.lastFired = -Infinity;
  }
}
