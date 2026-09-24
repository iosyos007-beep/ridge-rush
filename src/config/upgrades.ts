import type { VehicleConfig, VehicleUpgradeableStats } from "./vehicles.ts";
import type { SaveManager } from "../systems/SaveManager.ts";

/** Every upgrade has the same number of purchasable levels and the same exponential cost
 * curve; only the id/label/description/physics-effects differ per upgrade. */
export const UPGRADE_MAX_LEVEL = 10;
export const UPGRADE_BASE_COST = 100;
export const UPGRADE_COST_GROWTH = 1.35;

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  /** Fractional bonus applied per level (multiplicatively) to each listed base stat, e.g.
   * `{ engineTorque: 0.1 }` means level 3 multiplies the base `engineTorque` by 1.3. */
  effects: Partial<Record<keyof VehicleUpgradeableStats, number>>;
}

/** The four upgrades every vehicle shares, per the Phase 3 spec (Engine, Suspension,
 * Tires/grip, 4WD-Traction). A fifth, vehicle-specific upgrade is defined on each
 * `VehicleConfig.specialUpgrade`. */
export const CORE_UPGRADES: UpgradeDef[] = [
  {
    id: "engine",
    name: "Engine",
    description: "More torque and a higher top speed.",
    effects: { engineTorque: 0.1, maxWheelSpeed: 0.04 },
  },
  {
    id: "suspension",
    name: "Suspension",
    description: "Stiffer springs and better damping soak up rough landings.",
    effects: { suspensionStiffness: 0.05, suspensionDamping: 0.05 },
  },
  {
    id: "tires",
    name: "Tires",
    description: "Better grip on the ground for faster acceleration and climbing.",
    effects: { tireFriction: 0.035 },
  },
  {
    id: "traction",
    name: "4WD Traction",
    description: "Sharper air control for landing tricky jumps safely.",
    effects: { airControlTorque: 0.08 },
  },
];

/** Returns the exponential-growth coin cost to go from `currentLevel` to `currentLevel + 1`. */
export function getUpgradeCost(currentLevel: number): number {
  return Math.round(UPGRADE_BASE_COST * Math.pow(UPGRADE_COST_GROWTH, currentLevel));
}

/** All five upgrade slots (four shared + the vehicle's own special one) for a vehicle. */
export function getUpgradesForVehicle(vehicle: VehicleConfig): UpgradeDef[] {
  return [...CORE_UPGRADES, vehicle.specialUpgrade];
}

/**
 * Applies every purchased upgrade level (read from the save file) to a vehicle's base
 * physics stats, returning a new config with the effective (upgraded) numbers. Pure aside
 * from the `SaveManager` read, so it's easy to unit-test the resulting numbers directly.
 */
export function getEffectiveVehicleConfig(
  vehicle: VehicleConfig,
  saveManager: SaveManager,
): VehicleConfig {
  const effective: VehicleConfig = { ...vehicle };
  // Accumulate the total fractional bonus per stat across every purchased upgrade first
  // (multiple upgrades can affect the same stat, e.g. a special upgrade "stacking" with the
  // core Engine upgrade), then apply each stat's total bonus once to the base value. Applying
  // bonuses per-upgrade directly to `effective` would make later upgrades silently overwrite
  // earlier ones instead of stacking.
  const totalBonusByStat = new Map<keyof VehicleUpgradeableStats, number>();

  for (const upgrade of getUpgradesForVehicle(vehicle)) {
    const level = saveManager.getUpgradeLevel(vehicle.id, upgrade.id);
    if (level <= 0) continue;

    for (const [statKey, perLevelBonus] of Object.entries(upgrade.effects) as Array<
      [keyof VehicleUpgradeableStats, number]
    >) {
      const previous = totalBonusByStat.get(statKey) ?? 0;
      totalBonusByStat.set(statKey, previous + level * perLevelBonus);
    }
  }

  for (const [statKey, totalBonus] of totalBonusByStat) {
    effective[statKey] = vehicle[statKey] * (1 + totalBonus);
  }

  return effective;
}
