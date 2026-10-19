/** Shared bounded motion values, independent of browser and GSAP. */
export function scrollPace(velocity: number) {
  return Math.min(2.5, Math.max(1, 1 + Math.abs(velocity) / 1800));
}
export function scrollDirection(velocity: number, previous: 1 | -1): 1 | -1 {
  return Math.abs(velocity) < 12 ? previous : velocity > 0 ? 1 : -1;
}

export const MAGNETIC_RADIUS = 18;
/** Radial clamp keeps diagonal motion within the same limit as either axis. */
export function magneticOffset(
  dx: number,
  dy: number,
  radius = MAGNETIC_RADIUS,
) {
  const x = dx * 0.24;
  const y = dy * 0.24;
  const length = Math.hypot(x, y);
  const scale = length > radius ? radius / length : 1;
  return { x: x * scale, y: y * scale };
}
