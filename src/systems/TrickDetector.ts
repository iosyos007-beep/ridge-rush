import type { Vehicle } from "../entities/Vehicle.ts";
import { TRICK_BALANCE } from "../config/balance.ts";
import { wrapAngleDelta, countFlips, countAirTimeUnits } from "./TrickMath.ts";

export interface TrickEvent {
  label: string;
  coins: number;
}

const FLIP_ORDINALS = ["", "Double ", "Triple ", "Quad ", "Quintuple "];

/**
 * Watches a vehicle across frames to detect airborne rotations (flips), air time, and
 * wheelies, emitting a `TrickEvent` (floating-text label + bonus coins) for each one. Landing
 * on the head (a crash) cancels any pending flip/air-time bonus for that airborne stretch, per
 * the design spec ("Landing on the head cancels the trick bonus").
 */
export class TrickDetector {
  private wasGrounded = true;
  private airborneStartSeconds = 0;
  private elapsedSeconds = 0;
  private rotationAccum = 0;
  private lastAngle = 0;

  private wheelieSeconds = 0;
  private wheelieAwarded = false;

  constructor(
    private readonly vehicle: Vehicle,
    private readonly onTrick: (event: TrickEvent) => void,
  ) {}

  update(deltaSeconds: number): void {
    this.elapsedSeconds += deltaSeconds;
    const grounded = this.vehicle.isGrounded;

    if (!grounded) {
      if (this.wasGrounded) {
        this.airborneStartSeconds = this.elapsedSeconds;
        this.rotationAccum = 0;
        this.lastAngle = this.vehicle.chassis.angle;
      } else {
        const delta = wrapAngleDelta(this.vehicle.chassis.angle - this.lastAngle);
        this.rotationAccum += delta;
        this.lastAngle = this.vehicle.chassis.angle;
      }
      this.wheelieSeconds = 0;
      this.wheelieAwarded = false;
    } else {
      if (!this.wasGrounded) this.handleLanding();
      this.updateWheelie(deltaSeconds);
    }

    this.wasGrounded = grounded;
  }

  private handleLanding(): void {
    if (this.vehicle.hasCrashed) return;

    const airSeconds = this.elapsedSeconds - this.airborneStartSeconds;

    const { count, direction } = countFlips(this.rotationAccum);
    if (count >= 1) {
      const ordinal = FLIP_ORDINALS[count - 1] ?? `${count}x `;
      const flipName = direction === "backward" ? "Back Flip" : "Front Flip";
      const coins = TRICK_BALANCE.flipCoinsPerRotation * count;
      this.onTrick({ label: `${ordinal}${flipName}! +${coins}`, coins });
    }

    const airUnits = countAirTimeUnits(
      airSeconds,
      TRICK_BALANCE.airTimeMinSeconds,
      0.5,
    );
    if (airUnits >= 1) {
      const coins = airUnits * TRICK_BALANCE.airTimeCoinsPerHalfSecond;
      this.onTrick({ label: `Air Time! +${coins}`, coins });
    }
  }

  private updateWheelie(deltaSeconds: number): void {
    const oneWheelUp = this.vehicle.isRearGrounded !== this.vehicle.isFrontGrounded;
    const moving = this.vehicle.speed >= TRICK_BALANCE.wheelieMinSpeed;

    if (oneWheelUp && moving) {
      this.wheelieSeconds += deltaSeconds;
      if (!this.wheelieAwarded && this.wheelieSeconds >= TRICK_BALANCE.wheelieMinSeconds) {
        this.wheelieAwarded = true;
        this.onTrick({ label: `Wheelie! +${TRICK_BALANCE.wheelieCoins}`, coins: TRICK_BALANCE.wheelieCoins });
      }
    } else {
      this.wheelieSeconds = 0;
      this.wheelieAwarded = false;
    }
  }
}
