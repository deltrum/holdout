import { Component } from '../core/Component.js';

export class MeshRef extends Component {
  static componentName = 'MeshRef';

  constructor(mesh) {
    super();
    this.mesh = mesh;
  }
}
