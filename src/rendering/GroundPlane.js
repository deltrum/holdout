import * as THREE from 'three';
import { CONFIG } from '../config/gameConfig.js';

export function createGroundPlane() {
  const size = CONFIG.world.groundSize;
  const geo = new THREE.PlaneGeometry(size, size);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      baseColor: { value: new THREE.Color(0x557733) },
      lineColor: { value: new THREE.Color(0x4a6b2d) },
      gridSize: { value: 1.0 },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 baseColor;
      uniform vec3 lineColor;
      uniform float gridSize;
      varying vec3 vWorldPos;
      void main() {
        vec2 grid = abs(fract(vWorldPos.xz / gridSize - 0.5) - 0.5);
        float line = min(grid.x, grid.y);
        float edge = smoothstep(0.0, 0.03, line);
        gl_FragColor = vec4(mix(lineColor, baseColor, edge), 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}
