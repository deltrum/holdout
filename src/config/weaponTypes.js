export const WEAPON_TYPES = {
  gun: {
    name: 'GUN',
    fireRate: 0.15,
    damage: 8,
    projectileSpeed: 20,
    maxAmmo: 30,
    reloadTime: 1.5,
    range: 0,       // 0 = projectile based, no range limit
    cone: 0,        // 0 = not cone based
    usesAmmo: true,
  },
  flame: {
    name: 'FLAME',
    fireRate: 0.05,
    damage: 4,
    projectileSpeed: 0,
    maxAmmo: 0,
    reloadTime: 0,
    range: 7,
    cone: 0.4,      // dot product threshold (~66 degree cone)
    usesAmmo: false,
  },
};
