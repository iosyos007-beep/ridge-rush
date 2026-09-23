import Phaser from "phaser";
import { HEAD_LABEL, TERRAIN_LABEL, type Vehicle } from "../entities/Vehicle.ts";
import { CRASH_BALANCE } from "../config/balance.ts";

/**
 * Watches Matter collision events for the driver's head touching terrain. On detection,
 * marks the vehicle crashed, applies a brief slow-motion effect, and fires `onCrash` after
 * the configured delay so the run-ending UI can show a "Knocked out!" beat.
 */
export class CrashDetector {
  private readonly scene: Phaser.Scene;
  private readonly vehicle: Vehicle;
  private readonly onCrash: () => void;
  private triggered = false;

  constructor(scene: Phaser.Scene, vehicle: Vehicle, onCrash: () => void) {
    this.scene = scene;
    this.vehicle = vehicle;
    this.onCrash = onCrash;
    scene.matter.world.on(
      "collisionstart",
      (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => this.onCollision(event),
    );
  }

  private onCollision(event: Phaser.Physics.Matter.Events.CollisionStartEvent): void {
    if (this.triggered) return;
    for (const pair of event.pairs) {
      const { bodyA, bodyB } = pair;
      const isHeadVsTerrain =
        (bodyA.label === HEAD_LABEL && bodyB.label === TERRAIN_LABEL) ||
        (bodyB.label === HEAD_LABEL && bodyA.label === TERRAIN_LABEL);
      const headBody = bodyA.label === HEAD_LABEL ? bodyA : bodyB;
      if (isHeadVsTerrain && headBody === this.vehicle.head) {
        this.triggerCrash();
        return;
      }
    }
  }

  private triggerCrash(): void {
    this.triggered = true;
    this.vehicle.markCrashed();
    this.scene.matter.world.engine.timing.timeScale = CRASH_BALANCE.slowMotionTimeScale;
    this.scene.time.delayedCall(CRASH_BALANCE.slowMotionDurationMs, () => {
      this.scene.matter.world.engine.timing.timeScale = 1;
      this.onCrash();
    });
  }
}
