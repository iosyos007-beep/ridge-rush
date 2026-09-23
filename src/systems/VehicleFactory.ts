import Phaser from "phaser";
import { Vehicle } from "../entities/Vehicle.ts";
import { getVehicleById } from "../config/vehicles.ts";

let nextCollisionGroup = -1;

/** Constructs a `Vehicle` from config, assigning it a unique negative collision group so its
 * own chassis/wheels/driver parts never collide with each other. */
export function createVehicle(
  scene: Phaser.Scene,
  vehicleId: string,
  x: number,
  y: number,
): Vehicle {
  const config = getVehicleById(vehicleId);
  const group = nextCollisionGroup--;
  return new Vehicle(scene, config, x, y, group);
}
