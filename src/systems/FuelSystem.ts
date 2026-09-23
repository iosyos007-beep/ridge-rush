import Phaser from "phaser";
import { Pickup } from "../entities/Pickup.ts";
import { TerrainGenerator } from "./TerrainGenerator.ts";
import { FUEL_BALANCE } from "../config/balance.ts";

/**
 * Manages the vehicle's fuel tank (drain over time, refuel on pickup) and spawns fuel-can
 * pickups ahead of the camera at increasing intervals.
 */
export class FuelSystem {
  private fuel: number;
  private readonly capacity: number;
  private stoppedSeconds = 0;
  private cansSpawned = 0;
  private nextSpawnDistance = FUEL_BALANCE.firstCanDistance;
  private readonly pickups: Pickup[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly terrain: TerrainGenerator,
    capacity: number,
  ) {
    this.capacity = capacity;
    this.fuel = capacity;
  }

  get amount(): number {
    return this.fuel;
  }

  get ratio(): number {
    return this.fuel / this.capacity;
  }

  get isEmpty(): boolean {
    return this.fuel <= 0;
  }

  /** Drains fuel based on input this frame. Returns true if the tank just ran dry. */
  drain(deltaSeconds: number, gasHeld: boolean): void {
    if (this.fuel <= 0) return;
    const rate = gasHeld ? FUEL_BALANCE.drainPerSecondGas : FUEL_BALANCE.drainPerSecondIdle;
    this.fuel = Math.max(0, this.fuel - rate * deltaSeconds);
  }

  refill(amount: number): void {
    this.fuel = Math.min(this.capacity, this.fuel + amount);
  }

  /** Tracks how long the vehicle has been stationary while empty; returns true once the
   * "out of fuel" grace period has elapsed. */
  updateStoppedTimer(deltaSeconds: number, speed: number): boolean {
    if (!this.isEmpty) {
      this.stoppedSeconds = 0;
      return false;
    }
    if (speed < FUEL_BALANCE.stoppedSpeedThreshold) {
      this.stoppedSeconds += deltaSeconds;
    } else {
      this.stoppedSeconds = 0;
    }
    return this.stoppedSeconds >= FUEL_BALANCE.stoppedGraceSeconds;
  }

  /** Spawns fuel cans ahead of the camera as the vehicle progresses. */
  update(distanceMeters: number, cameraRightWorldX: number): void {
    if (distanceMeters < this.nextSpawnDistance) return;
    const x = cameraRightWorldX + 300;
    const y = -this.terrain.heightAt(x) - 40;
    this.pickups.push(new Pickup(this.scene, "fuel", 0, x, y));
    this.cansSpawned += 1;
    this.nextSpawnDistance +=
      FUEL_BALANCE.baseCanInterval + this.cansSpawned * FUEL_BALANCE.canIntervalGrowth;
  }

  /** Removes and returns pickups the vehicle has touched (caller applies the effect). */
  collectOverlapping(vehicleX: number, vehicleY: number, radius: number): Pickup[] {
    const collected: Pickup[] = [];
    for (const pickup of this.pickups) {
      if (pickup.isCollected) continue;
      const dist = Phaser.Math.Distance.Between(vehicleX, vehicleY, pickup.position.x, pickup.position.y);
      if (dist <= radius) {
        pickup.collect(this.scene);
        collected.push(pickup);
      }
    }
    return collected;
  }

  destroy(): void {
    for (const pickup of this.pickups) pickup.collect(this.scene);
  }
}
