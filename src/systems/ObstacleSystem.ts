import Phaser from "phaser";
import type { TerrainGenerator } from "./TerrainGenerator.ts";
import type { StageConfig } from "../config/stages.ts";

export const OBSTACLE_LABEL = "obstacle-crate";

/**
 * Spawns dynamic, pushable physics crates ahead of the camera for stages with a `hazards`
 * config (currently only Scrapyard). Purely a physics obstacle — no gameplay penalty for
 * touching one, per the spec ("physics boxes/obstacles to push").
 */
export class ObstacleSystem {
  private nextSpawnDistance: number;
  private readonly crates: Array<{
    body: MatterJS.BodyType;
    graphics: Phaser.GameObjects.Graphics;
    size: number;
  }> = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly terrain: TerrainGenerator,
    private readonly stage: StageConfig,
  ) {
    this.nextSpawnDistance = stage.hazards?.startDistance ?? Number.POSITIVE_INFINITY;
  }

  update(distanceMeters: number, cameraRightWorldX: number): void {
    const hazards = this.stage.hazards;
    if (!hazards || distanceMeters < this.nextSpawnDistance) return;

    const x = cameraRightWorldX + 260;
    const size = Phaser.Math.Between(28, 44);
    const y = -this.terrain.heightAt(x) - size / 2 - 2;

    const body = this.scene.matter.bodies.rectangle(x, y, size, size, {
      label: OBSTACLE_LABEL,
      friction: 0.6,
      frictionAir: 0.02,
      density: 0.0015,
      chamfer: { radius: 3 },
    });
    this.scene.matter.world.add(body);

    const graphics = this.scene.add.graphics();
    graphics.setDepth(9);
    this.crates.push({ body, graphics, size });

    this.nextSpawnDistance += hazards.spacingMeters;
  }

  /** Redraws every crate at its current physics position/rotation; call once per frame. */
  render(): void {
    for (const crate of this.crates) {
      const { body, graphics, size } = crate;
      graphics.clear();
      graphics.save();
      graphics.translateCanvas(body.position.x, body.position.y);
      graphics.rotateCanvas(body.angle);
      graphics.fillStyle(0x1a1a1a, 1);
      graphics.fillRect(-size / 2 - 2, -size / 2 - 2, size + 4, size + 4);
      graphics.fillStyle(0x9a6b3a, 1);
      graphics.fillRect(-size / 2, -size / 2, size, size);
      graphics.lineStyle(2, 0x5a3d1f, 1);
      graphics.strokeRect(-size / 2 + 4, -size / 2 + 4, size - 8, size - 8);
      graphics.lineBetween(-size / 2, -size / 2, size / 2, size / 2);
      graphics.lineBetween(size / 2, -size / 2, -size / 2, size / 2);
      graphics.restore();
    }
  }

  /** Removes crates that have fallen far behind the camera. */
  pruneBehind(cameraLeftWorldX: number): void {
    for (let i = this.crates.length - 1; i >= 0; i--) {
      const crate = this.crates[i];
      if (crate && crate.body.position.x < cameraLeftWorldX - 400) {
        this.scene.matter.world.remove(crate.body);
        crate.graphics.destroy();
        this.crates.splice(i, 1);
      }
    }
  }

  destroy(): void {
    for (const crate of this.crates) {
      this.scene.matter.world.remove(crate.body);
      crate.graphics.destroy();
    }
    this.crates.length = 0;
  }
}
