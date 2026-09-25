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

    const targetLookAhead = Phaser.Math.Clamp(speed * 2.4, 0, 180) * facing;
    this.lookAheadX = Phaser.Math.Linear(this.lookAheadX, targetLookAhead, deltaSeconds * 3.5);

    const targetX = chassis.position.x + this.lookAheadX;
    const targetY = chassis.position.y - 90;

    this.camera.scrollX = Phaser.Math.Linear(
      this.camera.scrollX,
      targetX - this.camera.width / 2,
      deltaSeconds * 5,
    );
    this.camera.scrollY = Phaser.Math.Linear(
      this.camera.scrollY,
      targetY - this.camera.height / 2,
      deltaSeconds * 4.5,
    );

    const targetZoom = Phaser.Math.Clamp(1.05 - speed / 850, 0.82, 1.05);
    this.camera.zoom = Phaser.Math.Linear(this.camera.zoom, targetZoom, deltaSeconds * 2.5);
  }
}
