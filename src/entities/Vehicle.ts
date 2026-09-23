import Phaser from "phaser";
import type { VehicleConfig } from "../config/vehicles.ts";

export const TERRAIN_LABEL = "terrain";
export const WHEEL_LABEL = "wheel";
export const CHASSIS_LABEL = "chassis";
export const HEAD_LABEL = "driver-head";
export const TORSO_LABEL = "driver-torso";

export interface VehicleInput {
  gas: boolean;
  brake: boolean;
}

/**
 * A drivable vehicle: a chassis body + two wheel bodies on suspension springs, plus a
 * ragdoll-lite driver (head + torso) rigidly-ish attached via constraints. Wheels are
 * motorized by ramping their angular velocity toward a target each step (approximating a
 * torque-limited motor, since Matter has no first-class motor primitive). While airborne,
 * gas/brake instead apply a rotational torque to the chassis for air control.
 */
export class Vehicle {
  readonly chassis: MatterJS.BodyType;
  readonly rearWheel: MatterJS.BodyType;
  readonly frontWheel: MatterJS.BodyType;
  readonly head: MatterJS.BodyType;
  readonly torso: MatterJS.BodyType;
  readonly config: VehicleConfig;

  private readonly scene: Phaser.Scene;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private rearGroundContacts = 0;
  private frontGroundContacts = 0;
  private crashed = false;

  constructor(scene: Phaser.Scene, config: VehicleConfig, x: number, y: number, group: number) {
    this.scene = scene;
    this.config = config;

    const matter = scene.matter;
    const Body = matter.body;

    const collisionFilter: MatterJS.ICollisionFilter = { group, category: 1, mask: 0xffffffff };

    this.chassis = matter.bodies.rectangle(x, y, config.chassisWidth, config.chassisHeight, {
      label: CHASSIS_LABEL,
      collisionFilter,
      friction: 0.05,
      frictionAir: 0.01,
      density: 0.0025,
      chamfer: { radius: 8 },
    });
    Body.setCentre(
      this.chassis,
      { x: 0, y: config.centerOfMassOffsetY },
      true, // relative offset from geometric center
    );

    const wheelOptions: MatterJS.IBodyDefinition = {
      collisionFilter,
      friction: config.tireFriction,
      frictionAir: 0.01,
      density: 0.004,
      label: WHEEL_LABEL,
    };
    // Spawn wheels already extended to the suspension's rest length below the chassis
    // mounting point, so the spring constraint starts at (approximately) zero tension
    // instead of snapping taut on the very first physics step.
    const wheelSpawnY = y + config.wheelOffsetY + config.suspensionRestLength;
    this.rearWheel = matter.bodies.circle(
      x - config.wheelOffsetX,
      wheelSpawnY,
      config.wheelRadius,
      wheelOptions,
    );
    this.frontWheel = matter.bodies.circle(
      x + config.wheelOffsetX,
      wheelSpawnY,
      config.wheelRadius,
      wheelOptions,
    );

    // Ragdoll-lite driver: torso pinned just above the chassis, head pinned above the torso.
    // Both share the vehicle's collision group so they never collide with the chassis/wheels.
    // Anchor points and rest lengths are derived so the constraints start at (approximately)
    // their rest length instead of snapping violently into place on the first physics step.
    const torsoHalfHeight = 13;
    const headRadius = 11;
    const hipRestLength = 4;
    const neckRestLength = 3;

    const chassisTopY = y - config.chassisHeight / 2;
    const torsoY = chassisTopY - torsoHalfHeight - hipRestLength;
    const torsoTopY = torsoY - torsoHalfHeight;
    const headY = torsoTopY - headRadius - neckRestLength;

    this.torso = matter.bodies.rectangle(x, torsoY, 16, torsoHalfHeight * 2, {
      collisionFilter,
      label: TORSO_LABEL,
      density: 0.001,
      friction: 0.5,
    });
    this.head = matter.bodies.circle(x, headY, headRadius, {
      collisionFilter,
      label: HEAD_LABEL,
      density: 0.0006,
      friction: 0.5,
    });

    const suspensionOptions = {
      stiffness: config.suspensionStiffness,
      damping: config.suspensionDamping,
      length: config.suspensionRestLength,
    };
    const rearSpring = matter.add.constraint(
      this.chassis,
      this.rearWheel,
      config.suspensionRestLength,
      config.suspensionStiffness,
      {
        ...suspensionOptions,
        pointA: { x: -config.wheelOffsetX, y: config.wheelOffsetY },
      },
    );
    const frontSpring = matter.add.constraint(
      this.chassis,
      this.frontWheel,
      config.suspensionRestLength,
      config.suspensionStiffness,
      {
        ...suspensionOptions,
        pointA: { x: config.wheelOffsetX, y: config.wheelOffsetY },
      },
    );

    // Secondary "guide" links: a plain distance constraint only resists elongation along the
    // anchor-to-wheel line, so it lets the wheel swing sideways like a pendulum under drive
    // torque (which otherwise pulls the wheelbase out of shape and destabilizes the chassis).
    // A second, stiffer link from a horizontally-offset anchor forms a triangulated wishbone
    // that keeps the wheel roughly directly below its mount while still allowing vertical travel.
    const guideOffset = 16;
    const guideRestLength = Math.hypot(guideOffset, config.suspensionRestLength);
    const rearGuide = matter.add.constraint(this.chassis, this.rearWheel, guideRestLength, 0.7, {
      pointA: { x: -config.wheelOffsetX - guideOffset, y: config.wheelOffsetY },
      damping: 0.2,
    });
    const frontGuide = matter.add.constraint(this.chassis, this.frontWheel, guideRestLength, 0.7, {
      pointA: { x: config.wheelOffsetX + guideOffset, y: config.wheelOffsetY },
      damping: 0.2,
    });

    const torsoJoint = matter.add.constraint(this.chassis, this.torso, hipRestLength, 0.6, {
      pointA: { x: 0, y: -config.chassisHeight / 2 },
      pointB: { x: 0, y: torsoHalfHeight },
    });
    const neckJoint = matter.add.constraint(this.torso, this.head, neckRestLength, 0.8, {
      pointA: { x: 0, y: -torsoHalfHeight },
      pointB: { x: 0, y: headRadius },
    });

    matter.world.add([
      this.chassis,
      this.rearWheel,
      this.frontWheel,
      this.torso,
      this.head,
      rearSpring,
      frontSpring,
      rearGuide,
      frontGuide,
      torsoJoint,
      neckJoint,
    ]);

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(10);

    this.setupGroundContactTracking();
  }

  private setupGroundContactTracking(): void {
    const matterWorld = this.scene.matter.world;
    matterWorld.on(
      "collisionstart",
      (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => this.onCollision(event, 1),
    );
    matterWorld.on(
      "collisionend",
      (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => this.onCollision(event, -1),
    );
  }

  private onCollision(
    event: Phaser.Physics.Matter.Events.CollisionStartEvent,
    delta: number,
  ): void {
    for (const pair of event.pairs) {
      const { bodyA, bodyB } = pair;
      const other = bodyA.label === TERRAIN_LABEL ? bodyB : bodyB.label === TERRAIN_LABEL ? bodyA : null;
      if (!other) continue;
      if (other === this.rearWheel) this.rearGroundContacts = Math.max(0, this.rearGroundContacts + delta);
      if (other === this.frontWheel) this.frontGroundContacts = Math.max(0, this.frontGroundContacts + delta);
    }
  }

  get isGrounded(): boolean {
    return this.rearGroundContacts > 0 || this.frontGroundContacts > 0;
  }

  get speed(): number {
    const v = this.chassis.velocity;
    return Math.hypot(v.x, v.y);
  }

  markCrashed(): void {
    this.crashed = true;
  }

  get hasCrashed(): boolean {
    return this.crashed;
  }

  /** Applies gas/brake input for this physics step. Call once per Matter update. */
  applyInput(input: VehicleInput): void {
    if (this.crashed) return;
    const Body = this.scene.matter.body;
    const direction = input.gas ? 1 : input.brake ? -1 : 0;

    if (this.isGrounded) {
      const target = direction * this.config.maxWheelSpeed;
      // Ramp angular velocity toward the target, limited by engine torque (max change/step).
      const rampRear = this.rampToward(this.rearWheel.angularVelocity, target, this.config.engineTorque);
      const rampFront = this.rampToward(
        this.frontWheel.angularVelocity,
        target,
        this.config.engineTorque,
      );
      Body.setAngularVelocity(this.rearWheel, rampRear);
      Body.setAngularVelocity(this.frontWheel, rampFront);
    } else if (direction !== 0) {
      // Airborne: gas rotates nose up (backward), brake rotates nose down (forward). Chassis
      // angle increases clockwise (nose-down) in Phaser's y-down convention, so gas (direction
      // = +1) must apply a *negative* angular velocity change to pitch the nose up. Clamp the
      // resulting angular velocity so held input can't spiral into an uncontrollable flip.
      const maxAirAngularVelocity = 0.06;
      const next = this.chassis.angularVelocity - direction * this.config.airControlTorque;
      Body.setAngularVelocity(
        this.chassis,
        Phaser.Math.Clamp(next, -maxAirAngularVelocity, maxAirAngularVelocity),
      );
    }
  }

  private rampToward(current: number, target: number, maxDelta: number): number {
    const diff = target - current;
    if (Math.abs(diff) <= maxDelta) return target;
    return current + Math.sign(diff) * maxDelta;
  }

  /** Syncs the procedurally-drawn graphics to the current physics body transforms. */
  render(): void {
    const g = this.graphics;
    g.clear();

    this.drawWheel(g, this.rearWheel);
    this.drawWheel(g, this.frontWheel);
    this.drawChassis(g);
    this.drawDriver(g);
  }

  private drawChassis(g: Phaser.GameObjects.Graphics): void {
    const { position, angle } = this.chassis;
    const { chassisWidth: w, chassisHeight: h, color, accentColor } = this.config;
    const outline = 0x1a1a1a;
    const outlineWidth = 4;

    g.save();
    g.translateCanvas(position.x, position.y);
    g.rotateCanvas(angle);

    // Rear bumper + front bumper (dark, chunky, slightly protruding).
    g.fillStyle(outline, 1);
    g.fillRoundedRect(-w / 2 - 6, h * 0.08, 10, h * 0.42, 3);
    g.fillRoundedRect(w / 2 - 4, h * 0.08, 10, h * 0.42, 3);

    // Main body: bold outline + flat cartoon fill.
    g.fillStyle(outline, 1);
    g.fillRoundedRect(-w / 2 - outlineWidth / 2, -h / 2 - outlineWidth / 2, w + outlineWidth, h + outlineWidth, 14);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 12);

    // Lower body accent stripe (cartoon shading, like the reference's darker underside).
    g.fillStyle(accentColor, 1);
    g.fillRoundedRect(-w / 2, h * 0.18, w, h * 0.32, 8);

    // Open-top cab: windshield strut + roll bar, evoking the reference's open jeep look.
    const cabX = -w * 0.08;
    const cabTopY = -h / 2 - 22;
    g.lineStyle(outlineWidth, outline, 1);
    g.lineBetween(cabX - w * 0.22, -h / 2 + 2, cabX - w * 0.16, cabTopY);
    g.lineBetween(cabX + w * 0.3, -h / 2 + 2, cabX + w * 0.26, cabTopY);
    g.lineBetween(cabX - w * 0.16, cabTopY, cabX + w * 0.26, cabTopY);
    g.fillStyle(0x9fd8ff, 0.85);
    g.fillRoundedRect(cabX - w * 0.12, -h / 2 - 16, w * 0.3, 16, 3);

    // Headlight + tail light dots for a friendly, readable silhouette.
    g.fillStyle(0xfff2a8, 1);
    g.fillCircle(w / 2 + 2, -h * 0.02, 5);
    g.lineStyle(2, outline, 1);
    g.strokeCircle(w / 2 + 2, -h * 0.02, 5);
    g.fillStyle(0xd94f4f, 1);
    g.fillCircle(-w / 2 - 2, -h * 0.02, 4);

    g.restore();
  }

  private drawWheel(g: Phaser.GameObjects.Graphics, wheel: MatterJS.BodyType): void {
    const { position, angle } = wheel;
    const r = this.config.wheelRadius;
    g.save();
    g.translateCanvas(position.x, position.y);
    g.rotateCanvas(angle);

    // Tire: thick black rubber ring with chunky tread notches for a knobby off-road look.
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(0, 0, r);
    const notchCount = 10;
    g.fillStyle(0x0d0d0d, 1);
    for (let i = 0; i < notchCount; i++) {
      const a = (i / notchCount) * Math.PI * 2;
      g.fillRect(Math.cos(a) * (r - 3) - 2, Math.sin(a) * (r - 3) - 2, 5, 5);
    }

    // Hub cap: light grey with a colored center cap and lug nuts, like the reference wheels.
    g.fillStyle(0xd8d8d8, 1);
    g.fillCircle(0, 0, r * 0.62);
    g.fillStyle(0x9a9a9a, 1);
    g.fillCircle(0, 0, r * 0.62);
    g.fillStyle(this.config.accentColor, 1);
    g.fillCircle(0, 0, r * 0.28);
    g.lineStyle(2, 0x1a1a1a, 1);
    g.strokeCircle(0, 0, r * 0.28);

    const lugCount = 5;
    g.fillStyle(0x3a3a3a, 1);
    for (let i = 0; i < lugCount; i++) {
      const a = (i / lugCount) * Math.PI * 2;
      g.fillCircle(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, 2.6);
    }

    g.restore();
  }

  private drawDriver(g: Phaser.GameObjects.Graphics): void {
    const outline = 0x1a1a1a;

    g.save();
    g.translateCanvas(this.torso.position.x, this.torso.position.y);
    g.rotateCanvas(this.torso.angle);
    g.fillStyle(outline, 1);
    g.fillRoundedRect(-9, -14, 18, 28, 5);
    g.fillStyle(0x3a6fb0, 1);
    g.fillRoundedRect(-8, -13, 16, 26, 4);
    g.restore();

    g.save();
    g.translateCanvas(this.head.position.x, this.head.position.y);
    // Head with a simple cap peak, echoing the reference driver's flat cap.
    g.fillStyle(outline, 1);
    g.fillCircle(0, 0, 12);
    g.fillStyle(0xf1c27d, 1);
    g.fillCircle(0, 1, 10.5);
    g.fillStyle(0xc0392b, 1);
    g.fillRoundedRect(-11, -11, 22, 7, 3);
    g.fillRect(-2, -6, 15, 4);
    g.restore();
  }

  destroy(): void {
    this.graphics.destroy();
    this.scene.matter.world.remove([
      this.chassis,
      this.rearWheel,
      this.frontWheel,
      this.torso,
      this.head,
    ]);
  }
}
