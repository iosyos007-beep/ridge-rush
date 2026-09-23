import { createNoise2D, type NoiseFunction2D } from "simplex-noise";
import type { StageConfig } from "../config/stages.ts";

/**
 * Deterministic pseudo-random number generator (mulberry32), seeded from a numeric seed.
 * Used to seed simplex-noise so the same stage seed always produces the same terrain.
 */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function random(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hashes an arbitrary seed string into a 32-bit integer (djb2 variant). */
export function hashSeedString(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  return hash >>> 0;
}

/**
 * Pure, Phaser/Matter-free terrain height function. Given a stage config, produces the
 * ground height (px, positive = higher ground / smaller screen-y) at any world x,
 * combining layered noise with a distance-based difficulty ramp and a slope clamp so
 * terrain stays drivable even as it gets harder farther from the start.
 */
export class TerrainHeightField {
  private readonly noise2D: NoiseFunction2D;
  private readonly stage: StageConfig;
  // Small cache so repeated left-to-right sampling (the normal terrain generation order)
  // stays O(1) per sample instead of recursing back to x = 0 every time.
  private readonly smoothedHeightCache = new Map<number, number>();

  constructor(stage: StageConfig) {
    this.stage = stage;
    const seedNumber = hashSeedString(stage.seed);
    this.noise2D = createNoise2D(mulberry32(seedNumber));
  }

  /** Amplitude (px) of the primary hill noise at a given world x, ramping with distance. */
  private amplitudeAt(x: number): number {
    const distanceMeters = Math.max(0, x) / 100;
    return this.stage.baseAmplitude + distanceMeters * this.stage.amplitudeGrowthPerMeter;
  }

  /** Raw (unsmoothed) height at x: primary rolling hills + secondary roughness noise. */
  private rawHeightAt(x: number): number {
    const primary = this.noise2D(x * this.stage.frequency, 0) * this.amplitudeAt(x);
    const secondary = this.noise2D(x * this.stage.frequency * 6.1, 100) * this.stage.roughness;
    return primary + secondary;
  }

  /**
   * Smoothed height at x, clamped so the slope between adjacent samples never exceeds
   * `maxSlopeRadians`. Requires samples to be taken in increasing-x order (the cache anchors
   * each value to the previous clamped sample); use `reset()` before re-sampling from x = 0.
   */
  heightAt(x: number): number {
    const step = 8;
    const cached = this.smoothedHeightCache.get(x);
    if (cached !== undefined) return cached;

    const h1 = this.rawHeightAt(x);
    const previous = this.smoothedHeightCache.get(x - step);
    if (previous === undefined) {
      // No prior sample to anchor to (e.g. first sample, or non-sequential access):
      // fall back to the raw value.
      this.smoothedHeightCache.set(x, h1);
      return h1;
    }

    const h0 = this.rawHeightAt(x - step);
    const rise = h1 - h0;
    const maxRise = Math.tan(this.stage.maxSlopeRadians) * step;
    const clampedRise = Math.max(-maxRise, Math.min(maxRise, rise));
    const value = previous + clampedRise;
    this.smoothedHeightCache.set(x, value);
    return value;
  }

  /** Clears the smoothing cache; call if you need to re-sample deterministically from x=0. */
  reset(): void {
    this.smoothedHeightCache.clear();
  }
}
