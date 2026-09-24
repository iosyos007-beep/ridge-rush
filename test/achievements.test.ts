import { describe, it, expect, beforeEach } from "vitest";
import { checkAchievements } from "../src/systems/AchievementManager.ts";
import { ACHIEVEMENTS } from "../src/config/achievements.ts";
import { SaveManager, type KeyValueStorage } from "../src/systems/SaveManager.ts";

class MemoryStorage implements KeyValueStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("checkAchievements", () => {
  let saveManager: SaveManager;

  beforeEach(() => {
    saveManager = new SaveManager(new MemoryStorage());
  });

  it("unlocks nothing for a fresh save", () => {
    expect(checkAchievements(saveManager)).toHaveLength(0);
  });

  it("unlocks a distance milestone once lifetime distance crosses its threshold, exactly once", () => {
    saveManager.recordRunStats(150, 0, 0, 0);
    const unlocked = checkAchievements(saveManager);
    expect(unlocked.map((a) => a.id)).toContain("distance-100");
    expect(saveManager.isAchievementUnlocked("distance-100")).toBe(true);

    // Running the check again shouldn't re-unlock (and re-pay) the same achievement.
    expect(checkAchievements(saveManager)).toHaveLength(0);
  });

  it("pays out the coin reward exactly once when an achievement unlocks", () => {
    const distance100 = ACHIEVEMENTS.find((a) => a.id === "distance-100")!;
    saveManager.recordRunStats(150, 0, 0, 0);
    checkAchievements(saveManager);
    expect(saveManager.getData().coins).toBe(distance100.coinReward);

    checkAchievements(saveManager);
    expect(saveManager.getData().coins).toBe(distance100.coinReward);
  });

  it("unlocks flip and wheelie milestones from accumulated lifetime totals", () => {
    for (let i = 0; i < 10; i++) saveManager.recordRunStats(0, 0, 1, 0);
    let unlocked = checkAchievements(saveManager);
    expect(unlocked.map((a) => a.id)).toContain("flips-10");

    for (let i = 0; i < 10; i++) saveManager.recordRunStats(0, 0, 0, 1);
    unlocked = checkAchievements(saveManager);
    expect(unlocked.map((a) => a.id)).toContain("wheelies-10");
  });

  it("every achievement id is unique", () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    expect(ids.size).toBe(ACHIEVEMENTS.length);
  });
});
