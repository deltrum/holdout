// Collision layer interaction matrix
const COLLISION_MATRIX = {
  projectile: new Set(['enemy']),
  enemy: new Set(['player', 'base']),
};

function shouldTest(layerA, layerB) {
  return (COLLISION_MATRIX[layerA]?.has(layerB)) || (COLLISION_MATRIX[layerB]?.has(layerA));
}

export class CollisionSystem {
  constructor() {
    this.collisionPairs = [];
  }

  update(dt, entityManager) {
    this.collisionPairs.length = 0;

    const collidables = entityManager.getEntitiesWith('Transform', 'Collider');
    const len = collidables.length;

    for (let i = 0; i < len; i++) {
      const a = collidables[i];
      const aT = a.getComponent('Transform');
      const aC = a.getComponent('Collider');

      for (let j = i + 1; j < len; j++) {
        const b = collidables[j];
        const bC = b.getComponent('Collider');

        if (!shouldTest(aC.layer, bC.layer)) continue;

        const bT = b.getComponent('Transform');
        const dx = aT.position.x - bT.position.x;
        const dz = aT.position.z - bT.position.z;
        const distSq = dx * dx + dz * dz;
        const radSum = aC.radius + bC.radius;

        if (distSq < radSum * radSum) {
          this.collisionPairs.push({ a, b });
        }
      }
    }
  }
}
