/**
 * Data-driven stage definitions. Terrain shape/difficulty and visual theme are entirely
 * config-controlled so new stages can be added without touching TerrainGenerator code.
 */

export interface StageHazardConfig {
  /** Distance (m) at which hazards of this stage start appearing. */
  startDistance: number;
}

export interface StageConfig {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Deterministic seed string; hashed internally into a numeric seed for the noise field. */
  seed: string;
  /** World gravity scale multiplier (1 = normal earth-like gravity). */
  gravityScale: number;
  /** Base ground friction (combined with tire friction via Matter's friction model). */
  groundFriction: number;
  /** Terrain amplitude in pixels at distance 0. */
  baseAmplitude: number;
  /** How much amplitude increases per meter traveled (difficulty ramp). */
  amplitudeGrowthPerMeter: number;
  /** Noise frequency (higher = bumpier/tighter hills). */
  frequency: number;
  /** Secondary high-frequency roughness noise amplitude (small bumps on top of hills). */
  roughness: number;
  /** Maximum allowed slope (radians) after smoothing; steeper is clamped down. */
  maxSlopeRadians: number;
  /** Sky gradient colors (top, bottom). */
  skyColorTop: number;
  skyColorBottom: number;
  /** Ground fill color and surface stripe color. */
  groundColor: number;
  surfaceColor: number;
  /** Parallax background layer colors (far to near). */
  parallaxColors: number[];
  hazards?: StageHazardConfig;
}

export const GREEN_HILLS: StageConfig = {
  id: "green-hills",
  name: "Green Hills",
  description: "Rolling grassy hills. The default proving ground.",
  price: 0,
  seed: "green-hills",
  gravityScale: 1,
  groundFriction: 0.9,
  baseAmplitude: 60,
  amplitudeGrowthPerMeter: 0.045,
  frequency: 0.0032,
  roughness: 10,
  maxSlopeRadians: 0.78,
  skyColorTop: 0x8fd0ff,
  skyColorBottom: 0xe8f8ff,
  groundColor: 0x6b4a2f,
  surfaceColor: 0x4c9a3f,
  parallaxColors: [0xbfe6ff, 0x9fd6c9, 0x7fc48f],
};

export const STAGES: StageConfig[] = [GREEN_HILLS];

export function getStageById(id: string): StageConfig {
  return STAGES.find((s) => s.id === id) ?? GREEN_HILLS;
}
