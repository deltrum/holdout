import * as THREE from 'three';
import { Component } from '../core/Component.js';

export class Transform extends Component {
  static componentName = 'Transform';

  constructor(position = new THREE.Vector3(), rotation = 0) {
    super();
    this.position = position.clone ? position.clone() : new THREE.Vector3(position.x || 0, position.y || 0, position.z || 0);
    this.rotation = rotation;
  }
}
