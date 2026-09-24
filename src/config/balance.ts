/**
 * Global balance constants that aren't tied to a specific vehicle or stage. Centralized
 * here so gameplay tuning stays in one place (per the project's data-driven config goal).
 */

export const FUEL_BALANCE = {
  /** Fuel units drained per second while holding gas. */
  drainPerSecondGas: 6,
  /** Fuel units drained per second at idle (engine running, no gas). */
  drainPerSecondIdle: 0.8,
  /** Fuel units restored by a single fuel can pickup. */
  refillPerCan: 40,
  /** Distance (m) before the first fuel can spawns. */
  firstCanDistance: 350,
  /** Base distance (m) between fuel can spawns. */
  baseCanInterval: 420,
  /** Extra distance added to the interval per can already spawned (increasing gaps). */
  canIntervalGrowth: 35,
  /** Seconds the vehicle must be stationary with an empty tank before the run ends. */
  stoppedGraceSeconds: 3,
  /** Speed (px/s) below which the vehicle counts as "stopped" for the fuel-out check. */
  stoppedSpeedThreshold: 4,
} as const;

export const COIN_BALANCE = {
  values: [5, 25, 100, 500] as const,
  /** Minimum distance (m) from start before each coin value starts appearing. */
  minDistanceForValue: [0, 150, 500, 1200] as const,
  /** Average spacing (m) between coin clusters. */
  clusterSpacing: 55,
} as const;

export const CRASH_BALANCE = {
  slowMotionTimeScale: 0.25,
  slowMotionDurationMs: 1500,
} as const;

/** World scale: how many pixels correspond to one "meter" for distance/HUD display. */
export const PIXELS_PER_METER = 30;

export const CHECKPOINT_BALANCE = {
  everyMeters: 500,
  coinBonus: 50,
  fuelBonusUnits: 15,
} as const;

export const TRICK_BALANCE = {
  /** Coins awarded per full 360° rotation completed while airborne (scales with flip count). */
  flipCoinsPerRotation: 200,
  /** Coins awarded per 0.5s increment of air time on a safe landing. */
  airTimeCoinsPerHalfSecond: 20,
  /** Minimum seconds airborne before an air-time bonus is granted at all. */
  airTimeMinSeconds: 0.6,
  /** Seconds one wheel must be off the ground (while the other is grounded and moving) before
   * a wheelie bonus triggers; re-triggers only after returning to a two/zero-wheel state. */
  wheelieMinSeconds: 1,
  wheelieCoins: 150,
  /** Minimum forward speed (px/s) required for wheelie detection, so idling doesn't count. */
  wheelieMinSpeed: 20,
} as const;
