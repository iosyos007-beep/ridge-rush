/**
 * Data-driven vehicle definitions. All physics tuning lives here so vehicle "feel"
 * can be adjusted without touching engine code, and new vehicles can be added purely
 * via config (see README for a walkthrough).
 */

export type DriveType = "RWD" | "FWD" | "AWD";

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
};

export const VEHICLES: VehicleConfig[] = [STARTER_JEEP];

export function getVehicleById(id: string): VehicleConfig {
  return VEHICLES.find((v) => v.id === id) ?? STARTER_JEEP;
}
