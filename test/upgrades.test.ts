import { describe, it, expect, beforeEach } from "vitest";
import {
  getUpgradeCost,
  getUpgradesForVehicle,
  getEffectiveVehicleConfig,
  UPGRADE_BASE_COST,
  UPGRADE_COST_GROWTH,
} from "../src/config/upgrades.ts";
import { STARTER_JEEP, RALLY_CAR, VEHICLES } from "../src/config/vehicles.ts";
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

describe("getUpgradeCost", () => {
  it("is deterministic and grows exponentially with level", () => {
    expect(getUpgradeCost(0)).toBe(UPGRADE_BASE_COST);
    expect(getUpgradeCost(1)).toBe(Math.round(UPGRADE_BASE_COST * UPGRADE_COST_GROWTH));
    expect(getUpgradeCost(5)).toBeGreaterThan(getUpgradeCost(4));
    // Same level always yields the same cost.
    expect(getUpgradeCost(3)).toBe(getUpgradeCost(3));
  });
});

describe("getUpgradesForVehicle", () => {
  it("returns the four shared core upgrades plus one vehicle-specific special upgrade", () => {
    const upgrades = getUpgradesForVehicle(STARTER_JEEP);
    expect(upgrades).toHaveLength(5);
    expect(upgrades.at(-1)).toBe(STARTER_JEEP.specialUpgrade);
  });

  it("every vehicle in the roster resolves to exactly 5 upgrade slots", () => {
    for (const vehicle of VEHICLES) {
      expect(getUpgradesForVehicle(vehicle)).toHaveLength(5);
    }
  });
});

describe("getEffectiveVehicleConfig", () => {
  let storage: MemoryStorage;
  let saveManager: SaveManager;

  beforeEach(() => {
    storage = new MemoryStorage();
    saveManager = new SaveManager(storage);
  });

  it("returns the unchanged base config when no upgrades are purchased", () => {
    const effective = getEffectiveVehicleConfig(STARTER_JEEP, saveManager);
    expect(effective.engineTorque).toBe(STARTER_JEEP.engineTorque);
    expect(effective.maxWheelSpeed).toBe(STARTER_JEEP.maxWheelSpeed);
    expect(effective.tireFriction).toBe(STARTER_JEEP.tireFriction);
  });

  it("applies purchased upgrade levels multiplicatively (non-compounding) to base stats", () => {
    saveManager.setUpgradeLevel(STARTER_JEEP.id, "engine", 3);
    const effective = getEffectiveVehicleConfig(STARTER_JEEP, saveManager);

    const engineUpgrade = getUpgradesForVehicle(STARTER_JEEP).find((u) => u.id === "engine")!;
    const expectedTorque = STARTER_JEEP.engineTorque * (1 + 3 * engineUpgrade.effects.engineTorque!);
    const expectedSpeed = STARTER_JEEP.maxWheelSpeed * (1 + 3 * engineUpgrade.effects.maxWheelSpeed!);

    expect(effective.engineTorque).toBeCloseTo(expectedTorque);
    expect(effective.maxWheelSpeed).toBeCloseTo(expectedSpeed);
    // Untouched stats stay at base value.
    expect(effective.tireFriction).toBe(STARTER_JEEP.tireFriction);
  });

  it("stacks bonuses from two different upgrades that both affect the same stat", () => {
    const vehicle = RALLY_CAR; // "Turbo Kit" special also targets maxWheelSpeed, like "Engine".
    saveManager.setUpgradeLevel(vehicle.id, "engine", 4);
    saveManager.setUpgradeLevel(vehicle.id, "turbo-kit", 2);

    const effective = getEffectiveVehicleConfig(vehicle, saveManager);
    const engineUpgrade = getUpgradesForVehicle(vehicle).find((u) => u.id === "engine")!;
    const engineBonus = engineUpgrade.effects.maxWheelSpeed!;
    const turboBonus = vehicle.specialUpgrade.effects.maxWheelSpeed!;
    const expectedSpeed = vehicle.maxWheelSpeed * (1 + 4 * engineBonus + 2 * turboBonus);

    expect(effective.maxWheelSpeed).toBeCloseTo(expectedSpeed);
  });
});
