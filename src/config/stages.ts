/**
 * Data-driven stage definitions. Terrain shape/difficulty and visual theme are entirely
 * config-controlled so new stages can be added without touching TerrainGenerator code.
 */

export interface StageHazardConfig {
  /** Distance (m) at which hazards of this stage start appearing. */
  startDistance: number;
  /** Average spacing (m) between spawned obstacle crates. */
  spacingMeters: number;
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
  /** If true, the scene renders a headlight cone on the vehicle and a much darker sky. */
  hasHeadlights?: boolean;
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

export const DESERT_DUNES: StageConfig = {
  id: "desert-dunes",
  name: "Desert Dunes",
  description: "Long, sweeping sand slopes. Momentum is everything out here.",
  price: 600,
  seed: "desert-dunes",
  gravityScale: 1,
  groundFriction: 0.75,
  baseAmplitude: 100,
  amplitudeGrowthPerMeter: 0.05,
  frequency: 0.0016,
  roughness: 6,
  maxSlopeRadians: 0.7,
  skyColorTop: 0xffd98a,
  skyColorBottom: 0xfff2d6,
  groundColor: 0xc9974f,
  surfaceColor: 0xe0b869,
  parallaxColors: [0xffe6b3, 0xf0c987, 0xd9a862],
};

export const FROZEN_PEAKS: StageConfig = {
  id: "frozen-peaks",
  name: "Frozen Peaks",
  description: "Slick ice underfoot. Tires struggle to find grip on the way up.",
  price: 1200,
  seed: "frozen-peaks",
  gravityScale: 1,
  groundFriction: 0.18,
  baseAmplitude: 70,
  amplitudeGrowthPerMeter: 0.05,
  frequency: 0.003,
  roughness: 8,
  maxSlopeRadians: 0.68,
  skyColorTop: 0xcfe8ff,
  skyColorBottom: 0xf0faff,
  groundColor: 0x7d97ab,
  surfaceColor: 0xe8f6ff,
  parallaxColors: [0xe6f4ff, 0xc9e4f7, 0xa9cfe8],
};

export const NIGHT_FOREST: StageConfig = {
  id: "night-forest",
  name: "Night Forest",
  description: "Pitch dark under the trees. Headlights only reach so far.",
  price: 1800,
  seed: "night-forest",
  gravityScale: 1,
  groundFriction: 0.88,
  baseAmplitude: 65,
  amplitudeGrowthPerMeter: 0.05,
  frequency: 0.0034,
  roughness: 11,
  maxSlopeRadians: 0.76,
  skyColorTop: 0x0a1220,
  skyColorBottom: 0x16222f,
  groundColor: 0x241a12,
  surfaceColor: 0x1f3a24,
  parallaxColors: [0x121b28, 0x0d1420, 0x090f18],
  hasHeadlights: true,
};

export const SCRAPYARD: StageConfig = {
  id: "scrapyard",
  name: "Scrapyard",
  description: "Rusted crates litter the ground; push through or bounce off them.",
  price: 2400,
  seed: "scrapyard",
  gravityScale: 1,
  groundFriction: 0.85,
  baseAmplitude: 50,
  amplitudeGrowthPerMeter: 0.04,
  frequency: 0.0035,
  roughness: 9,
  maxSlopeRadians: 0.75,
  skyColorTop: 0x9aa5ad,
  skyColorBottom: 0xd8dde0,
  groundColor: 0x5a5650,
  surfaceColor: 0x8a7d5a,
  parallaxColors: [0xc4c8ca, 0xa9aeae, 0x8d9190],
  hazards: { startDistance: 150, spacingMeters: 90 },
};

export const LUNAR_BASE: StageConfig = {
  id: "lunar-base",
  name: "Lunar Base",
  description: "Low gravity lets you soar over craters — and float a long way past them.",
  price: 3000,
  seed: "lunar-base",
  gravityScale: 0.35,
  groundFriction: 0.6,
  baseAmplitude: 90,
  amplitudeGrowthPerMeter: 0.06,
  frequency: 0.0026,
  roughness: 12,
  maxSlopeRadians: 0.85,
  skyColorTop: 0x0b0b18,
  skyColorBottom: 0x1c1c30,
  groundColor: 0x555565,
  surfaceColor: 0x8888a0,
  parallaxColors: [0x2a2a40, 0x1e1e33, 0x151527],
};

export const STAGES: StageConfig[] = [
  GREEN_HILLS,
  DESERT_DUNES,
  FROZEN_PEAKS,
  NIGHT_FOREST,
  SCRAPYARD,
  LUNAR_BASE,
];

export function getStageById(id: string): StageConfig {
  return STAGES.find((s) => s.id === id) ?? GREEN_HILLS;
}

