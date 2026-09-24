/**
 * Pure, Phaser/Matter-free math helpers for trick detection, so rotation counting can be
 * unit-tested deterministically without spinning up a physics world.
 */

const TWO_PI = Math.PI * 2;

/** Wraps an angle delta into the (-PI, PI] range, so accumulating deltas across the -PI/PI
 * boundary (which Matter angles cross constantly during a flip) doesn't produce a huge jump. */
export function wrapAngleDelta(delta: number): number {
  let wrapped = delta % TWO_PI;
  if (wrapped > Math.PI) wrapped -= TWO_PI;
  if (wrapped < -Math.PI) wrapped += TWO_PI;
  return wrapped;
}

export type FlipDirection = "forward" | "backward";

export interface FlipResult {
  /** Number of full 360° rotations completed (0 if less than one full rotation). */
  count: number;
  /** "forward" = nose-down rotation (brake in air), "backward" = nose-up rotation (gas in air). */
  direction: FlipDirection;
}

/**
 * Given a total accumulated signed rotation (radians, positive = nose-down/forward direction,
 * negative = nose-up/backward direction), returns how many full rotations were completed and
 * in which direction. Returns `count: 0` if fewer than one full rotation was accumulated.
 */
export function countFlips(totalRotationRadians: number): FlipResult {
  const count = Math.floor(Math.abs(totalRotationRadians) / TWO_PI);
  const direction: FlipDirection = totalRotationRadians >= 0 ? "forward" : "backward";
  return { count, direction };
}

/** Returns how many discrete `unitSeconds` increments fit into `airSeconds`, or 0 if the
 * total air time didn't reach `minSeconds`. */
export function countAirTimeUnits(
  airSeconds: number,
  minSeconds: number,
  unitSeconds: number,
): number {
  if (airSeconds < minSeconds) return 0;
  return Math.floor(airSeconds / unitSeconds);
}
