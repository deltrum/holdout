import * as THREE from 'three';
import { Component } from '../core/Component.js';

export class Velocity extends Component {
  static componentName = 'Velocity';

  constructor(direction = new THREE.Vector3(), speed = 0) {
    super();
    this.direction = direction.clone ? direction.clone() : new THREE.Vector3();
    this.speed = speed;
  }
}
