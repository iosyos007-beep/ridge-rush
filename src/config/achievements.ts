/**
 * Data-driven achievement definitions. Each achievement is checked (in `AchievementManager`)
 * against a snapshot of the save file; once its `check` returns true it's permanently
 * unlocked and its coin reward is paid out exactly once.
 */
import type { SaveDataV1 } from "../systems/SaveManager.ts";
import { VEHICLES } from "./vehicles.ts";
import { STAGES } from "./stages.ts";
import { UPGRADE_MAX_LEVEL } from "./upgrades.ts";

/** Read-only snapshot of the save fields achievements are allowed to inspect. */
export interface AchievementContext {
  stats: SaveDataV1["stats"];
  unlockedVehicleIds: readonly string[];
  unlockedStageIds: readonly string[];
  unlockedSkinIds: readonly string[];
  upgradeLevels: Readonly<Record<string, Record<string, number>>>;
  bestDistanceByStageVehicle: Readonly<Record<string, number>>;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  coinReward: number;
  check: (ctx: AchievementContext) => boolean;
}

function maxUpgradeLevel(ctx: AchievementContext): number {
  let max = 0;
  for (const levels of Object.values(ctx.upgradeLevels)) {
    for (const level of Object.values(levels)) max = Math.max(max, level);
  }
  return max;
}

function vehiclesWithAllUpgradesMaxed(ctx: AchievementContext): number {
  let count = 0;
  for (const vehicleId of ctx.unlockedVehicleIds) {
    const levels = ctx.upgradeLevels[vehicleId] ?? {};
    const values = Object.values(levels);
    if (values.length >= 5 && values.every((level) => level >= UPGRADE_MAX_LEVEL)) count += 1;
  }
  return count;
}

function bestSingleRunDistance(ctx: AchievementContext): number {
  let max = 0;
  for (const distance of Object.values(ctx.bestDistanceByStageVehicle)) max = Math.max(max, distance);
  return max;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // --- Distance milestones (lifetime, across all runs) ---
  { id: "distance-100", name: "First Steps", description: "Drive a total of 100 m.", coinReward: 50, check: (c) => c.stats.totalDistanceMeters >= 100 },
  { id: "distance-1000", name: "Getting Somewhere", description: "Drive a total of 1,000 m.", coinReward: 100, check: (c) => c.stats.totalDistanceMeters >= 1000 },
  { id: "distance-10000", name: "Road Warrior", description: "Drive a total of 10,000 m.", coinReward: 250, check: (c) => c.stats.totalDistanceMeters >= 10000 },
  { id: "distance-50000", name: "Marathon Driver", description: "Drive a total of 50,000 m.", coinReward: 600, check: (c) => c.stats.totalDistanceMeters >= 50000 },
  { id: "distance-100000", name: "Odometer Breaker", description: "Drive a total of 100,000 m.", coinReward: 1200, check: (c) => c.stats.totalDistanceMeters >= 100000 },
  // --- Single-run distance ---
  { id: "single-run-500", name: "Long Haul", description: "Reach 500 m in a single run.", coinReward: 150, check: (c) => bestSingleRunDistance(c) >= 500 },
  { id: "single-run-1500", name: "Horizon Chaser", description: "Reach 1,500 m in a single run.", coinReward: 350, check: (c) => bestSingleRunDistance(c) >= 1500 },
  // --- Tricks ---
  { id: "flips-10", name: "Getting Air", description: "Land 10 flips in total.", coinReward: 100, check: (c) => c.stats.totalFlips >= 10 },
  { id: "flips-50", name: "Aerial Ace", description: "Land 50 flips in total.", coinReward: 300, check: (c) => c.stats.totalFlips >= 50 },
  { id: "flips-200", name: "Gravity Defier", description: "Land 200 flips in total.", coinReward: 800, check: (c) => c.stats.totalFlips >= 200 },
  { id: "wheelies-10", name: "On Two Wheels", description: "Pull 10 wheelies in total.", coinReward: 100, check: (c) => c.stats.totalWheelies >= 10 },
  { id: "wheelies-50", name: "Balancing Act", description: "Pull 50 wheelies in total.", coinReward: 300, check: (c) => c.stats.totalWheelies >= 50 },
  // --- Coins ---
  { id: "coins-500", name: "Piggy Bank", description: "Earn 500 coins in total.", coinReward: 50, check: (c) => c.stats.totalCoinsEarned >= 500 },
  { id: "coins-2000", name: "Coin Collector", description: "Earn 2,000 coins in total.", coinReward: 150, check: (c) => c.stats.totalCoinsEarned >= 2000 },
  { id: "coins-10000", name: "Treasure Hoarder", description: "Earn 10,000 coins in total.", coinReward: 500, check: (c) => c.stats.totalCoinsEarned >= 10000 },
  { id: "coins-50000", name: "Coin Tycoon", description: "Earn 50,000 coins in total.", coinReward: 1500, check: (c) => c.stats.totalCoinsEarned >= 50000 },
  // --- Collection ---
  { id: "own-all-vehicles", name: "Full Garage", description: "Unlock every vehicle.", coinReward: 500, check: (c) => c.unlockedVehicleIds.length >= VEHICLES.length },
  { id: "own-all-stages", name: "World Traveler", description: "Unlock every stage.", coinReward: 500, check: (c) => c.unlockedStageIds.length >= STAGES.length },
  { id: "own-3-skins", name: "Fresh Coat", description: "Unlock 3 paint jobs.", coinReward: 150, check: (c) => c.unlockedSkinIds.length >= 3 },
  { id: "own-all-skins", name: "Paint Connoisseur", description: "Unlock every paint job.", coinReward: 400, check: (c) => c.unlockedSkinIds.length >= 5 },
  // --- Upgrades ---
  { id: "first-upgrade", name: "Under the Hood", description: "Buy your first upgrade.", coinReward: 50, check: (c) => maxUpgradeLevel(c) >= 1 },
  { id: "max-one-upgrade", name: "Fully Tuned", description: "Max out any single upgrade.", coinReward: 200, check: (c) => maxUpgradeLevel(c) >= UPGRADE_MAX_LEVEL },
  { id: "max-one-vehicle", name: "Dream Machine", description: "Max out every upgrade on one vehicle.", coinReward: 700, check: (c) => vehiclesWithAllUpgradesMaxed(c) >= 1 },
  // --- Runs ---
  { id: "runs-10", name: "Regular Driver", description: "Complete 10 runs.", coinReward: 100, check: (c) => c.stats.totalRuns >= 10 },
  { id: "runs-50", name: "Seasoned Racer", description: "Complete 50 runs.", coinReward: 300, check: (c) => c.stats.totalRuns >= 50 },
  { id: "runs-200", name: "Ridge Rush Veteran", description: "Complete 200 runs.", coinReward: 900, check: (c) => c.stats.totalRuns >= 200 },
];

export function getAchievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
