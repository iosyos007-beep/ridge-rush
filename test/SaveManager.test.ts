import { describe, it, expect, beforeEach } from "vitest";
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

describe("SaveManager", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("creates default save data when nothing is stored", () => {
    const manager = new SaveManager(storage);
    const data = manager.getData();
    expect(data.coins).toBe(0);
    expect(data.unlockedVehicleIds).toContain("starter-jeep");
    expect(data.unlockedStageIds).toContain("green-hills");
  });

  it("persists coins across load/save", () => {
    const manager = new SaveManager(storage);
    manager.addCoins(150);

    const reloaded = new SaveManager(storage);
    expect(reloaded.getData().coins).toBe(150);
  });

  it("spendCoins fails when balance is insufficient and succeeds otherwise", () => {
    const manager = new SaveManager(storage);
    manager.addCoins(100);
    expect(manager.spendCoins(150)).toBe(false);
    expect(manager.spendCoins(60)).toBe(true);
    expect(manager.getData().coins).toBe(40);
  });

  it("only records a new best distance when it's an improvement", () => {
    const manager = new SaveManager(storage);
    expect(manager.recordBestDistance("green-hills", "starter-jeep", 500)).toBe(true);
    expect(manager.recordBestDistance("green-hills", "starter-jeep", 300)).toBe(false);
    expect(manager.getBestDistance("green-hills", "starter-jeep")).toBe(500);
  });

  it("migrates malformed/legacy data to a fresh default save", () => {
    storage.setItem("ridge-rush-save", JSON.stringify({ version: 0 }));
    const manager = new SaveManager(storage);
    expect(manager.getData().coins).toBe(0);
  });

  it("resetProgress restores defaults and persists them", () => {
    const manager = new SaveManager(storage);
    manager.addCoins(999);
    manager.resetProgress();
    expect(manager.getData().coins).toBe(0);

    const reloaded = new SaveManager(storage);
    expect(reloaded.getData().coins).toBe(0);
  });

  it("tracks upgrade levels per vehicle", () => {
    const manager = new SaveManager(storage);
    expect(manager.getUpgradeLevel("starter-jeep", "engine")).toBe(0);
    manager.setUpgradeLevel("starter-jeep", "engine", 3);
    expect(manager.getUpgradeLevel("starter-jeep", "engine")).toBe(3);
  });
});
