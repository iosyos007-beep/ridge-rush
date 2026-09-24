import Phaser from "phaser";
import { Vehicle } from "../entities/Vehicle.ts";
import type { VehicleConfig } from "../config/vehicles.ts";

let nextCollisionGroup = -1;

/** Constructs a `Vehicle` from a resolved config (already including any purchased
 * upgrades), assigning it a unique negative collision group so its own chassis/wheels/
 * driver parts never collide with each other. */
export function createVehicle(
  scene: Phaser.Scene,
  config: VehicleConfig,
  x: number,
  y: number,
): Vehicle {
  const group = nextCollisionGroup--;
  return new Vehicle(scene, config, x, y, group);
}
