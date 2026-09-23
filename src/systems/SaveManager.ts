export interface SaveDataV1 {
  version: 1;
  bestDistanceByStageVehicle: Record<string, number>;
  coins: number;
  unlockedVehicleIds: string[];
  unlockedStageIds: string[];
  upgradeLevels: Record<string, Record<string, number>>;
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

  return data as SaveDataV1;
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

  resetProgress(): void {
    this.data = createDefaultSave();
    this.save();
  }
}
