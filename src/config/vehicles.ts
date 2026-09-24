/**
 * Data-driven vehicle definitions. All physics tuning lives here so vehicle "feel"
 * can be adjusted without touching engine code, and new vehicles can be added purely
 * via config (see README for a walkthrough).
 */
import type { UpgradeDef } from "./upgrades.ts";

export type DriveType = "RWD" | "FWD" | "AWD";

/** Which procedural silhouette `Vehicle.drawChassis` should use. Lets each vehicle look
 * distinct while still sharing the same 2-wheel chassis/suspension physics rig. */
export type VehicleBodyStyle =
  | "jeep"
  | "bike"
  | "truck"
  | "rally"
  | "monster"
  | "tractor"
  | "buggy"
  | "crab";

export interface VehicleUpgradeableStats {
  /** Engine torque applied to driven wheels, in Matter angular-velocity units per step. */
  engineTorque: number;
  /** Maximum wheel angular speed (rad/s), caps top speed. */
  maxWheelSpeed: number;
  /** Suspension spring stiffness (0..1, Matter constraint stiffness). */
  suspensionStiffness: number;
  /** Suspension damping (0..1). */
  suspensionDamping: number;
  /** Tire friction coefficient applied to wheel bodies. */
  tireFriction: number;
  /** Torque applied to the chassis for air control (rotation while airborne). */
  airControlTorque: number;
  /** Fuel tank capacity in "units" (drained over time). */
  fuelCapacity: number;
}

export interface VehicleConfig extends VehicleUpgradeableStats {
  id: string;
  name: string;
  description: string;
  /** Coin price to unlock; 0 = unlocked from the start. */
  price: number;
  /** Overall chassis mass in kg-equivalent (Matter density is derived from this + area). */
  mass: number;
  /** Chassis half-width/half-height, in pixels, defining the collision rectangle. */
  chassisWidth: number;
  chassisHeight: number;
  /** Wheel radius in pixels. */
  wheelRadius: number;
  /** Horizontal offset of each wheel from chassis center, in pixels. */
  wheelOffsetX: number;
  /** Vertical offset of each wheel from chassis center (positive = below center), in pixels. */
  wheelOffsetY: number;
  /** Rest length of the suspension constraint, in pixels. */
  suspensionRestLength: number;
  /** Vertical offset of the center of mass from the chassis geometric center (px, + = lower). */
  centerOfMassOffsetY: number;
  driveType: DriveType;
  /** Tint color for the procedurally drawn chassis. */
  color: number;
  accentColor: number;
  bodyStyle: VehicleBodyStyle;
  /** If true, this vehicle has a small cosmetic part (spoiler/bumper) that can detach on a
   * hard landing (see `Vehicle`'s breakable-part logic). Purely visual; optional per vehicle. */
  breakablePartsEnabled?: boolean;
  /** The one vehicle-specific upgrade slot (in addition to the four shared CORE_UPGRADES). */
  specialUpgrade: UpgradeDef;
}

export const STARTER_JEEP: VehicleConfig = {
  id: "starter-jeep",
  name: "Starter Jeep",
  description: "A balanced, forgiving all-rounder. Great for learning the ropes.",
  price: 0,
  mass: 90,
  chassisWidth: 108,
  chassisHeight: 46,
  wheelRadius: 26,
  wheelOffsetX: 46,
  wheelOffsetY: 24,
  suspensionRestLength: 30,
  centerOfMassOffsetY: 6,
  driveType: "AWD",
  engineTorque: 0.09,
  maxWheelSpeed: 2.6,
  suspensionStiffness: 0.28,
  suspensionDamping: 0.12,
  tireFriction: 0.95,
  airControlTorque: 0.012,
  fuelCapacity: 100,
  color: 0xe0663f,
  accentColor: 0x2b3a4a,
  bodyStyle: "jeep",
  specialUpgrade: {
    id: "spare-fuel-cell",
    name: "Spare Fuel Cell",
    description: "A bolted-on extra tank for longer runs.",
    effects: { fuelCapacity: 0.08 },
  },
};

export const DIRT_BIKE: VehicleConfig = {
  id: "dirt-bike",
  name: "Scrambler",
  description: "Light and nimble with great air control, but fragile on hard landings.",
  price: 800,
  mass: 45,
  chassisWidth: 70,
  chassisHeight: 30,
  wheelRadius: 22,
  wheelOffsetX: 32,
  wheelOffsetY: 18,
  suspensionRestLength: 26,
  centerOfMassOffsetY: 2,
  driveType: "RWD",
  engineTorque: 0.075,
  maxWheelSpeed: 2.9,
  suspensionStiffness: 0.22,
  suspensionDamping: 0.09,
  tireFriction: 0.85,
  airControlTorque: 0.02,
  fuelCapacity: 70,
  color: 0xf2a71b,
  accentColor: 0x2b3a4a,
  bodyStyle: "bike",
  specialUpgrade: {
    id: "extra-tank",
    name: "Extra Tank",
    description: "A bigger reserve tank strapped to the frame.",
    effects: { fuelCapacity: 0.09 },
  },
};

export const PICKUP_TRUCK: VehicleConfig = {
  id: "pickup-truck",
  name: "Hauler",
  description: "Heavy and stable. Shrugs off rough terrain that would topple lighter rigs.",
  price: 1500,
  mass: 140,
  chassisWidth: 120,
  chassisHeight: 50,
  wheelRadius: 28,
  wheelOffsetX: 50,
  wheelOffsetY: 26,
  suspensionRestLength: 34,
  centerOfMassOffsetY: 8,
  driveType: "RWD",
  engineTorque: 0.085,
  maxWheelSpeed: 2.2,
  suspensionStiffness: 0.34,
  suspensionDamping: 0.16,
  tireFriction: 0.95,
  airControlTorque: 0.009,
  fuelCapacity: 130,
  color: 0x3a6fb0,
  accentColor: 0x1f2f3f,
  bodyStyle: "truck",
  breakablePartsEnabled: true,
  specialUpgrade: {
    id: "long-haul-tank",
    name: "Long-Haul Tank",
    description: "A full-size tank for long-distance hauling.",
    effects: { fuelCapacity: 0.1 },
  },
};

export const RALLY_CAR: VehicleConfig = {
  id: "rally-car",
  name: "Apex Sprinter",
  description: "Fast and low to the ground. Rewards a smooth line over rough jumps.",
  price: 2200,
  mass: 75,
  chassisWidth: 100,
  chassisHeight: 34,
  wheelRadius: 22,
  wheelOffsetX: 44,
  wheelOffsetY: 16,
  suspensionRestLength: 20,
  centerOfMassOffsetY: 4,
  driveType: "AWD",
  engineTorque: 0.11,
  maxWheelSpeed: 3.2,
  suspensionStiffness: 0.3,
  suspensionDamping: 0.11,
  tireFriction: 0.9,
  airControlTorque: 0.011,
  fuelCapacity: 90,
  color: 0xd94f4f,
  accentColor: 0x1a1a1a,
  bodyStyle: "rally",
  breakablePartsEnabled: true,
  specialUpgrade: {
    id: "turbo-kit",
    name: "Turbo Kit",
    description: "Squeezes extra top speed out of the engine.",
    effects: { maxWheelSpeed: 0.06 },
  },
};

export const MONSTER_TRUCK: VehicleConfig = {
  id: "monster-truck",
  name: "Colossus",
  description: "Huge wheels roll straight over obstacles that stop everything else.",
  price: 3200,
  mass: 160,
  chassisWidth: 110,
  chassisHeight: 46,
  wheelRadius: 46,
  wheelOffsetX: 50,
  wheelOffsetY: 40,
  suspensionRestLength: 46,
  centerOfMassOffsetY: 10,
  driveType: "AWD",
  engineTorque: 0.1,
  maxWheelSpeed: 2.0,
  suspensionStiffness: 0.24,
  suspensionDamping: 0.14,
  tireFriction: 1.05,
  airControlTorque: 0.01,
  fuelCapacity: 110,
  color: 0x5fae4a,
  accentColor: 0x2b3a4a,
  bodyStyle: "monster",
  breakablePartsEnabled: true,
  specialUpgrade: {
    id: "monster-grip",
    name: "Monster Grip",
    description: "Deeper tread for even more traction.",
    effects: { tireFriction: 0.05 },
  },
};

export const TRACTOR: VehicleConfig = {
  id: "tractor",
  name: "Old Ironplow",
  description: "Slow but unstoppable, with huge low-end torque for the steepest climbs.",
  price: 1900,
  mass: 150,
  chassisWidth: 100,
  chassisHeight: 48,
  wheelRadius: 34,
  wheelOffsetX: 42,
  wheelOffsetY: 30,
  suspensionRestLength: 34,
  centerOfMassOffsetY: 10,
  driveType: "RWD",
  engineTorque: 0.15,
  maxWheelSpeed: 1.4,
  suspensionStiffness: 0.3,
  suspensionDamping: 0.16,
  tireFriction: 1.0,
  airControlTorque: 0.008,
  fuelCapacity: 140,
  color: 0xd9a441,
  accentColor: 0x5a3a1a,
  bodyStyle: "tractor",
  specialUpgrade: {
    id: "torque-converter",
    name: "Torque Converter",
    description: "Even more low-end grunt for brutal climbs.",
    effects: { engineTorque: 0.07 },
  },
};

export const HOVER_BUGGY: VehicleConfig = {
  id: "hover-buggy",
  name: "Zephyr Buggy",
  description: "Ultra-soft suspension gives it a floaty, low-gravity feel over bumps.",
  price: 2600,
  mass: 55,
  chassisWidth: 90,
  chassisHeight: 36,
  wheelRadius: 24,
  wheelOffsetX: 40,
  wheelOffsetY: 20,
  suspensionRestLength: 40,
  centerOfMassOffsetY: 2,
  driveType: "AWD",
  engineTorque: 0.08,
  maxWheelSpeed: 2.7,
  suspensionStiffness: 0.16,
  suspensionDamping: 0.06,
  tireFriction: 0.8,
  airControlTorque: 0.016,
  fuelCapacity: 85,
  color: 0x8fd6ff,
  accentColor: 0xffffff,
  bodyStyle: "buggy",
  specialUpgrade: {
    id: "extended-range-cells",
    name: "Extended Range Cells",
    description: "More capacity in the buggy's fuel cells.",
    effects: { fuelCapacity: 0.09 },
  },
};

export const CRAB_CRAWLER: VehicleConfig = {
  id: "crab-crawler",
  name: "Hex Crawler",
  description: "A wacky six-legged crawler. Its scrambling legs grip almost anything.",
  price: 4200,
  mass: 70,
  chassisWidth: 96,
  chassisHeight: 40,
  wheelRadius: 20,
  wheelOffsetX: 50,
  wheelOffsetY: 22,
  suspensionRestLength: 24,
  centerOfMassOffsetY: 4,
  driveType: "AWD",
  engineTorque: 0.095,
  maxWheelSpeed: 2.3,
  suspensionStiffness: 0.3,
  suspensionDamping: 0.14,
  tireFriction: 1.1,
  airControlTorque: 0.013,
  fuelCapacity: 95,
  color: 0xc0392b,
  accentColor: 0x1a1a1a,
  bodyStyle: "crab",
  specialUpgrade: {
    id: "extra-leg-servos",
    name: "Extra Leg Servos",
    description: "Extra actuators help right the crawler mid-air.",
    effects: { airControlTorque: 0.06 },
  },
};

export const VEHICLES: VehicleConfig[] = [
  STARTER_JEEP,
  DIRT_BIKE,
  PICKUP_TRUCK,
  TRACTOR,
  RALLY_CAR,
  HOVER_BUGGY,
  MONSTER_TRUCK,
  CRAB_CRAWLER,
];

export function getVehicleById(id: string): VehicleConfig {
  return VEHICLES.find((v) => v.id === id) ?? STARTER_JEEP;
}

