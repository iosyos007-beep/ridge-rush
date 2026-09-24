import Phaser from "phaser";
import { Pickup } from "../entities/Pickup.ts";
import { TerrainGenerator } from "./TerrainGenerator.ts";
import { COIN_BALANCE } from "../config/balance.ts";

/**
 * Spawns coin clusters (arcs/lines) ahead of the camera, with higher values appearing only
 * beyond their configured minimum distance, and tracks the running collected total.
 */
export class CoinSystem {
  private total = 0;
  private nextSpawnDistance = COIN_BALANCE.clusterSpacing;
  private readonly pickups: Pickup[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly terrain: TerrainGenerator,
  ) {}

  get collectedTotal(): number {
    return this.total;
  }

  /** Adds coins directly to the running total (e.g. trick bonuses), without spawning a
   * pickup entity in the world. */
  addBonusCoins(amount: number): void {
    this.total += amount;
  }

  update(distanceMeters: number, cameraRightWorldX: number): void {
    if (distanceMeters < this.nextSpawnDistance) return;

    const value = this.pickValueForDistance(distanceMeters);
    const startX = cameraRightWorldX + 250;
    const count = 5;
    const arcHeight = 60;
    for (let i = 0; i < count; i++) {
      const x = startX + i * 26;
      const groundY = -this.terrain.heightAt(x);
      const arc = Math.sin((i / (count - 1)) * Math.PI) * arcHeight;
      const y = groundY - 40 - arc;
      this.pickups.push(new Pickup(this.scene, "coin", value, x, y));
    }

    this.nextSpawnDistance += COIN_BALANCE.clusterSpacing;
  }

  private pickValueForDistance(distanceMeters: number): number {
    let best: number = COIN_BALANCE.values[0];
    for (let i = 0; i < COIN_BALANCE.values.length; i++) {
      const minDist = COIN_BALANCE.minDistanceForValue[i] ?? 0;
      if (distanceMeters >= minDist) best = COIN_BALANCE.values[i] ?? best;
    }
    return best;
  }

  collectOverlapping(vehicleX: number, vehicleY: number, radius: number): number {
    let gained = 0;
    for (const pickup of this.pickups) {
      if (pickup.isCollected) continue;
      const dist = Phaser.Math.Distance.Between(vehicleX, vehicleY, pickup.position.x, pickup.position.y);
      if (dist <= radius) {
        pickup.collect(this.scene);
        gained += pickup.value;
      }
    }
    if (gained > 0) this.total += gained;
    return gained;
  }

  destroy(): void {
    for (const pickup of this.pickups) pickup.collect(this.scene);
  }
}
