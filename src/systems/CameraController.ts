import Phaser from "phaser";
import type { Vehicle } from "../entities/Vehicle.ts";

/**
 * Smoothly follows the vehicle with speed-based look-ahead and a slight zoom-out at high
 * speed, implemented manually (rather than Phaser's built-in `startFollow`) so look-ahead
 * and zoom can be tuned together.
 */
export class CameraController {
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private readonly vehicle: Vehicle;
  private lookAheadX = 0;

  constructor(camera: Phaser.Cameras.Scene2D.Camera, vehicle: Vehicle) {
    this.camera = camera;
    this.vehicle = vehicle;
  }

  update(deltaSeconds: number): void {
    const chassis = this.vehicle.chassis;
    const speed = this.vehicle.speed;
    const facing = chassis.velocity.x >= 0 ? 1 : -1;

    const targetLookAhead = Phaser.Math.Clamp(speed * 4, 0, 220) * facing;
    this.lookAheadX = Phaser.Math.Linear(this.lookAheadX, targetLookAhead, deltaSeconds * 2);

    const targetX = chassis.position.x + this.lookAheadX;
    const targetY = chassis.position.y - 60;

    this.camera.scrollX = Phaser.Math.Linear(
      this.camera.scrollX,
      targetX - this.camera.width / 2,
      deltaSeconds * 3,
    );
    this.camera.scrollY = Phaser.Math.Linear(
      this.camera.scrollY,
      targetY - this.camera.height / 2,
      deltaSeconds * 3,
    );

    const targetZoom = Phaser.Math.Clamp(1 - speed / 600, 0.75, 1);
    this.camera.zoom = Phaser.Math.Linear(this.camera.zoom, targetZoom, deltaSeconds * 2);
  }
}
