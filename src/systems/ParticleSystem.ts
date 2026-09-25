import Phaser from "phaser";

const DOT_TEXTURE_KEY = "rr-particle-dot";

/** Generates (once per scene) a tiny filled-circle texture that every particle emitter in
 * this system reuses, since the project draws everything procedurally rather than shipping
 * sprite assets. */
function ensureDotTexture(scene: Phaser.Scene): string {
  if (!scene.textures.exists(DOT_TEXTURE_KEY)) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture(DOT_TEXTURE_KEY, 8, 8);
    g.destroy();
  }
  return DOT_TEXTURE_KEY;
}

/**
 * Wraps the small set of particle effects the game needs (wheel dust/snow, exhaust smoke,
 * landing sparks) behind a single settings-aware API. When `particlesEnabled` is off (a
 * "graphics quality" setting), every method becomes a no-op and no emitters are even
 * created, so low-end devices don't pay for GPU/CPU work the player opted out of.
 */
export class ParticleSystem {
  private readonly enabled: boolean;
  private dustEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private exhaustEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparkEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene, enabled: boolean, dustTint: number) {
    this.enabled = enabled;
    if (!enabled) return;

    const texture = ensureDotTexture(scene);

    this.dustEmitter = scene.add.particles(0, 0, texture, {
      speed: { min: 20, max: 70 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.55, end: 0 },
      lifespan: 420,
      frequency: 55,
      tint: dustTint,
    });
    this.dustEmitter.stop();

    this.exhaustEmitter = scene.add.particles(0, 0, texture, {
      speed: { min: 10, max: 30 },
      angle: { min: 250, max: 290 },
      scale: { start: 0.5, end: 1.2 },
      alpha: { start: 0.35, end: 0 },
      lifespan: 500,
      frequency: 90,
      tint: 0x888888,
    });
    this.exhaustEmitter.stop();

    this.sparkEmitter = scene.add.particles(0, 0, texture, {
      speed: { min: 80, max: 220 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 300,
      tint: [0xfff2a8, 0xffe27a, 0xffffff],
      emitting: false,
    });
  }

  /** Emits (or stops emitting) wheel dust at the given world position; call every frame with
   * the vehicle's current grounded/moving state. */
  setWheelDust(active: boolean, x: number, y: number): void {
    if (!this.enabled || !this.dustEmitter) return;
    this.dustEmitter.setPosition(x, y);
    if (active) this.dustEmitter.start();
    else this.dustEmitter.stop();
  }

  /** Emits (or stops emitting) exhaust smoke at the given world position/direction; call
   * every frame with whether gas is currently held. */
  setExhaust(active: boolean, x: number, y: number): void {
    if (!this.enabled || !this.exhaustEmitter) return;
    this.exhaustEmitter.setPosition(x, y);
    if (active) this.exhaustEmitter.start();
    else this.exhaustEmitter.stop();
  }

  /** One-shot spark burst for a hard landing. */
  burstSparks(x: number, y: number, count = 14): void {
    if (!this.enabled || !this.sparkEmitter) return;
    this.sparkEmitter.explode(count, x, y);
  }

  destroy(): void {
    this.dustEmitter?.destroy();
    this.exhaustEmitter?.destroy();
    this.sparkEmitter?.destroy();
  }
}

/** Each `GameScene` run gets its own `ParticleSystem` instance (dust tint varies per stage,
 * and emitters must be destroyed when the scene shuts down) — this factory just keeps the
 * "respect the particlesEnabled setting" construction logic in one place. */
export function getParticleSystem(
  scene: Phaser.Scene,
  particlesEnabled: boolean,
  dustTint = 0x8a6a3a,
): ParticleSystem {
  return new ParticleSystem(scene, particlesEnabled, dustTint);
}
