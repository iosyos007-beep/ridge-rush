/** Lifetime totals accumulated across every run, used to evaluate achievements and some
 * daily challenges. Distinct from per-stage/per-vehicle best distances. */
export interface LifetimeStats {
  totalDistanceMeters: number;
  totalCoinsEarned: number;
  totalFlips: number;
  totalWheelies: number;
  totalRuns: number;
}

/** Today's 3 generated daily challenges plus in-progress/completed state. Regenerated
 * (see `ChallengeManager`) whenever `dateKey` no longer matches "today". */
export interface DailyChallengeState {
  dateKey: string;
  progressById: Record<string, number>;
  completedIds: string[];
}

export interface SaveDataV1 {
  version: 1;
  bestDistanceByStageVehicle: Record<string, number>;
  coins: number;
  unlockedVehicleIds: string[];
  unlockedStageIds: string[];
  upgradeLevels: Record<string, Record<string, number>>;
  selectedVehicleId: string;
  stats: LifetimeStats;
  unlockedAchievementIds: string[];
  unlockedSkinIds: string[];
  selectedSkinByVehicle: Record<string, string>;
  dailyChallenge: DailyChallengeState;
  settings: {
    musicVolume: number;
    sfxVolume: number;
    swapPedals: boolean;
    particlesEnabled: boolean;
  };
}

export type SaveData = SaveDataV1;

export const CURRENT_SAVE_VERSION = 1;

const STORAGE_KEY = "ridge-rush-save";

function createDefaultSave(): SaveDataV1 {
  return {
    version: 1,
    bestDistanceByStageVehicle: {},
    coins: 0,
    unlockedVehicleIds: ["starter-jeep"],
    unlockedStageIds: ["green-hills"],
    upgradeLevels: {},
    selectedVehicleId: "starter-jeep",
    stats: {
      totalDistanceMeters: 0,
      totalCoinsEarned: 0,
      totalFlips: 0,
      totalWheelies: 0,
      totalRuns: 0,
    },
    unlockedAchievementIds: [],
    unlockedSkinIds: [],
    selectedSkinByVehicle: {},
    dailyChallenge: {
      dateKey: "",
      progressById: {},
      completedIds: [],
    },
    settings: {
      musicVolume: 0.7,
      sfxVolume: 0.8,
      swapPedals: false,
      particlesEnabled: true,
    },
  };
}

/**
 * Minimal storage interface compatible with `localStorage`, injectable for testing
 * (avoids requiring a DOM/localStorage implementation in unit tests).
 */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Migrates a parsed-but-unknown-shape save blob forward to the current schema version.
 * Each migration step only needs to bridge from its own version to version + 1; the loop
 * below applies every necessary step in sequence.
 */
function migrate(data: { version?: unknown }): SaveDataV1 {
  const version = typeof data.version === "number" ? data.version : 0;

  if (version < 1) {
    // No prior versions exist yet; version 0 (or malformed) is treated as "no save".
    return createDefaultSave();
  }

  // Defensive backfill for saves written before `selectedVehicleId` existed within v1.
  const loaded = data as SaveDataV1;
  if (typeof loaded.selectedVehicleId !== "string") {
    loaded.selectedVehicleId = "starter-jeep";
  }
  // Defensive backfill for saves written before Phase 4 (stats/achievements/cosmetics/daily
  // challenges) existed within v1, same pattern as `selectedVehicleId` above.
  if (typeof loaded.stats !== "object" || loaded.stats === null) {
    loaded.stats = {
      totalDistanceMeters: 0,
      totalCoinsEarned: 0,
      totalFlips: 0,
      totalWheelies: 0,
      totalRuns: 0,
    };
  }
  if (!Array.isArray(loaded.unlockedAchievementIds)) loaded.unlockedAchievementIds = [];
  if (!Array.isArray(loaded.unlockedSkinIds)) loaded.unlockedSkinIds = [];
  if (typeof loaded.selectedSkinByVehicle !== "object" || loaded.selectedSkinByVehicle === null) {
    loaded.selectedSkinByVehicle = {};
  }
  if (typeof loaded.dailyChallenge !== "object" || loaded.dailyChallenge === null) {
    loaded.dailyChallenge = { dateKey: "", progressById: {}, completedIds: [] };
  }
  return loaded;
}

export class SaveManager {
  private readonly storage: KeyValueStorage;
  private data: SaveDataV1;

  constructor(storage: KeyValueStorage = globalThis.localStorage) {
    this.storage = storage;
    this.data = this.load();
  }

  private load(): SaveDataV1 {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSave();

    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return createDefaultSave();
      return migrate(parsed as { version?: unknown });
    } catch {
      return createDefaultSave();
    }
  }

  save(): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  }

  getData(): Readonly<SaveDataV1> {
    return this.data;
  }

  addCoins(amount: number): void {
    this.data.coins = Math.max(0, this.data.coins + amount);
    this.save();
  }

  spendCoins(amount: number): boolean {
    if (this.data.coins < amount) return false;
    this.data.coins -= amount;
    this.save();
    return true;
  }

  recordBestDistance(stageId: string, vehicleId: string, distanceMeters: number): boolean {
    const key = `${stageId}:${vehicleId}`;
    const previousBest = this.data.bestDistanceByStageVehicle[key] ?? 0;
    if (distanceMeters <= previousBest) return false;
    this.data.bestDistanceByStageVehicle[key] = distanceMeters;
    this.save();
    return true;
  }

  getBestDistance(stageId: string, vehicleId: string): number {
    return this.data.bestDistanceByStageVehicle[`${stageId}:${vehicleId}`] ?? 0;
  }

  isVehicleUnlocked(vehicleId: string): boolean {
    return this.data.unlockedVehicleIds.includes(vehicleId);
  }

  unlockVehicle(vehicleId: string): void {
    if (!this.data.unlockedVehicleIds.includes(vehicleId)) {
      this.data.unlockedVehicleIds.push(vehicleId);
      this.save();
    }
  }

  isStageUnlocked(stageId: string): boolean {
    return this.data.unlockedStageIds.includes(stageId);
  }

  unlockStage(stageId: string): void {
    if (!this.data.unlockedStageIds.includes(stageId)) {
      this.data.unlockedStageIds.push(stageId);
      this.save();
    }
  }

  getUpgradeLevel(vehicleId: string, upgradeId: string): number {
    return this.data.upgradeLevels[vehicleId]?.[upgradeId] ?? 0;
  }

  setUpgradeLevel(vehicleId: string, upgradeId: string, level: number): void {
    this.data.upgradeLevels[vehicleId] ??= {};
    this.data.upgradeLevels[vehicleId][upgradeId] = level;
    this.save();
  }

  updateSettings(partial: Partial<SaveDataV1["settings"]>): void {
    this.data.settings = { ...this.data.settings, ...partial };
    this.save();
  }

  getSelectedVehicleId(): string {
    return this.data.selectedVehicleId;
  }

  setSelectedVehicleId(vehicleId: string): void {
    this.data.selectedVehicleId = vehicleId;
    this.save();
  }

  resetProgress(): void {
    this.data = createDefaultSave();
    this.save();
  }

  // --- Phase 4: lifetime stats (achievements) -----------------------------------------

  getStats(): Readonly<LifetimeStats> {
    return this.data.stats;
  }

  /** Called once per completed run to accumulate lifetime totals used by achievements and
   * some daily challenges. Coins/flips/wheelies should be this run's totals, not deltas. */
  recordRunStats(distanceMeters: number, coinsEarned: number, flips: number, wheelies: number): void {
    this.data.stats.totalDistanceMeters += distanceMeters;
    this.data.stats.totalCoinsEarned += coinsEarned;
    this.data.stats.totalFlips += flips;
    this.data.stats.totalWheelies += wheelies;
    this.data.stats.totalRuns += 1;
    this.save();
  }

  // --- Phase 4: achievements -----------------------------------------------------------

  isAchievementUnlocked(achievementId: string): boolean {
    return this.data.unlockedAchievementIds.includes(achievementId);
  }

  unlockAchievement(achievementId: string): void {
    if (!this.data.unlockedAchievementIds.includes(achievementId)) {
      this.data.unlockedAchievementIds.push(achievementId);
      this.save();
    }
  }

  // --- Phase 4: cosmetics/skins ----------------------------------------------------------

  isSkinUnlocked(skinId: string): boolean {
    return skinId === "default" || this.data.unlockedSkinIds.includes(skinId);
  }

  unlockSkin(skinId: string): void {
    if (!this.data.unlockedSkinIds.includes(skinId)) {
      this.data.unlockedSkinIds.push(skinId);
      this.save();
    }
  }

  getSelectedSkin(vehicleId: string): string {
    return this.data.selectedSkinByVehicle[vehicleId] ?? "default";
  }

  setSelectedSkin(vehicleId: string, skinId: string): void {
    this.data.selectedSkinByVehicle[vehicleId] = skinId;
    this.save();
  }

  // --- Phase 4: daily challenges ---------------------------------------------------------

  getDailyChallengeState(): Readonly<DailyChallengeState> {
    return this.data.dailyChallenge;
  }

  /** Overwrites today's challenge state (used both to seed a fresh day's challenges and to
   * persist updated progress/completion). */
  setDailyChallengeState(state: DailyChallengeState): void {
    this.data.dailyChallenge = state;
    this.save();
  }
}
