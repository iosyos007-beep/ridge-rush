import { ACHIEVEMENTS, type AchievementDef, type AchievementContext } from "../config/achievements.ts";
import type { SaveManager } from "./SaveManager.ts";

/** Builds the read-only snapshot achievements are checked against, straight from the save. */
function buildContext(saveManager: SaveManager): AchievementContext {
  const data = saveManager.getData();
  return {
    stats: data.stats,
    unlockedVehicleIds: data.unlockedVehicleIds,
    unlockedStageIds: data.unlockedStageIds,
    unlockedSkinIds: data.unlockedSkinIds,
    upgradeLevels: data.upgradeLevels,
    bestDistanceByStageVehicle: data.bestDistanceByStageVehicle,
  };
}

/**
 * Checks every not-yet-unlocked achievement against the current save state, unlocking (and
 * paying out the coin reward for) any that now pass. Cheap enough to call after every run,
 * garage purchase, or unlock — call sites don't need to know which achievements might apply.
 */
export function checkAchievements(saveManager: SaveManager): AchievementDef[] {
  const ctx = buildContext(saveManager);
  const newlyUnlocked: AchievementDef[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (saveManager.isAchievementUnlocked(achievement.id)) continue;
    if (!achievement.check(ctx)) continue;
    saveManager.unlockAchievement(achievement.id);
    saveManager.addCoins(achievement.coinReward);
    newlyUnlocked.push(achievement);
  }

  return newlyUnlocked;
}
