export const CONFIG = {
  player: {
    speed: 8,
    health: 100,
    colliderRadius: 0.5,
  },
  base: {
    health: 500,
    colliderRadius: 2.0,
  },
  weapon: {
    fireRate: 0.15,
    projectileSpeed: 20,
    damage: 8,
    lifetime: 2.0,
    maxAmmo: 30,
    reloadTime: 1.5,
  },
  wave: {
    baseEnemyCount: 5,
    enemyCountGrowth: 3,
    quadraticGrowth: 0.2,
    intermissionTime: 5,
    spawnRadius: 25,
    baseSpawnInterval: 0.8,
    spawnIntervalShrink: 0.03,
  },
  camera: {
    frustumWidth: 40,
    height: 50,
    followSpeed: 4,
  },
  world: {
    groundSize: 60,
  },
};
