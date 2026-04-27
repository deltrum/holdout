export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function angleBetween(x1, z1, x2, z2) {
  return Math.atan2(x2 - x1, z2 - z1);
}

export function distanceSq(x1, z1, x2, z2) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  return dx * dx + dz * dz;
}

export function distance(x1, z1, x2, z2) {
  return Math.sqrt(distanceSq(x1, z1, x2, z2));
}

export function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

export function randomPointOnCircle(radius) {
  const angle = Math.random() * Math.PI * 2;
  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
  };
}
