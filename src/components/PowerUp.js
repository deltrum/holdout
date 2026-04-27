import { Component } from '../core/Component.js';

export const POWERUP_TYPES = {
  health:    { color: 0x44ff44, label: '+HP',       duration: 0,   pickupRadius: 1.2 },
  speed:     { color: 0x44ddff, label: 'SPEED',     duration: 8,   pickupRadius: 1.2 },
  rapidfire: { color: 0xffff44, label: 'RAPID',     duration: 6,   pickupRadius: 1.2 },
  damage:    { color: 0xff4444, label: 'DAMAGE',    duration: 8,   pickupRadius: 1.2 },
  shield:    { color: 0xffffff, label: 'SHIELD',    duration: 5,   pickupRadius: 1.2 },
};

export class PowerUp extends Component {
  static componentName = 'PowerUp';

  constructor(type = 'health') {
    super();
    this.type = type;
    this.lifetime = 10; // despawn after 10s
    this.bobPhase = Math.random() * Math.PI * 2;
  }
}
