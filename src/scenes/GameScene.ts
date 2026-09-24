import Phaser from "phaser";
import { getVehicleById } from "../config/vehicles.ts";
import { getStageById } from "../config/stages.ts";
import { PIXELS_PER_METER, CHECKPOINT_BALANCE } from "../config/balance.ts";
import { createVehicle } from "../systems/VehicleFactory.ts";
import { TerrainGenerator } from "../systems/TerrainGenerator.ts";
import { CrashDetector } from "../systems/CrashDetector.ts";
import { FuelSystem } from "../systems/FuelSystem.ts";
import { CoinSystem } from "../systems/CoinSystem.ts";
import { CameraController } from "../systems/CameraController.ts";
import { ParallaxBackground } from "../systems/ParallaxBackground.ts";
import { TrickDetector, type TrickEvent } from "../systems/TrickDetector.ts";
import { showFloatingText } from "../ui/TrickPopup.ts";
import type { Vehicle } from "../entities/Vehicle.ts";

export interface GameSceneData {
  vehicleId: string;
  stageId: string;
}

export interface RunResults {
  distanceMeters: number;
  coinsCollected: number;
  trickBonusCoins: number;
  reason: "crashed" | "out-of-fuel";
  isNewRecord: boolean;
}

/** The core driving scene: physics world, terrain, vehicle, camera, and run-ending logic.
 * Touch/keyboard input is read here directly (kept simple for the Phase 1 MVP); the HUD is
 * rendered by the parallel `HUDScene`. */
export class GameScene extends Phaser.Scene {
  private vehicle!: Vehicle;
  private terrain!: TerrainGenerator;
  private fuelSystem!: FuelSystem;
  private coinSystem!: CoinSystem;
  private cameraController!: CameraController;
  private parallax!: ParallaxBackground;
  private trickDetector!: TrickDetector;
  private trickBonusCoins = 0;

  private startX = 0;
  private distanceMeters = 0;
  private nextCheckpointDistance = CHECKPOINT_BALANCE.everyMeters;
  private runEnded = false;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;

  /** Touch/HUD-driven input flags; HUDScene sets these directly via `scene.get("GameScene")`. */
  touchGas = false;
  touchBrake = false;

  private stageId = "green-hills";
  private vehicleId = "starter-jeep";

  constructor() {
    super("GameScene");
  }

  init(data: GameSceneData): void {
    this.vehicleId = data.vehicleId;
    this.stageId = data.stageId;
    this.runEnded = false;
    this.distanceMeters = 0;
    this.trickBonusCoins = 0;
    this.nextCheckpointDistance = CHECKPOINT_BALANCE.everyMeters;
  }

  create(): void {
    const stage = getStageById(this.stageId);
    const vehicleConfig = getVehicleById(this.vehicleId);

    this.cameras.main.setBackgroundColor(stage.skyColorTop);
    this.matter.world.setGravity(0, stage.gravityScale);

    this.parallax = new ParallaxBackground(this, stage, this.cameras.main);

    this.terrain = new TerrainGenerator(this, stage);
    this.startX = 0;
    this.terrain.primeAround(this.startX);

    const spawnY = -this.terrain.heightAt(this.startX) - 120;
    this.vehicle = createVehicle(this, this.vehicleId, this.startX, spawnY);

    this.fuelSystem = new FuelSystem(this, this.terrain, vehicleConfig.fuelCapacity);
    this.coinSystem = new CoinSystem(this, this.terrain);
    this.cameraController = new CameraController(this.cameras.main, this.vehicle);
    new CrashDetector(this, this.vehicle, () => this.endRun("crashed"));
    this.trickDetector = new TrickDetector(this.vehicle, (event) => this.onTrick(event));

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    }

    this.scene.launch("HUDScene", { gameSceneKey: "GameScene" });

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  override update(_time: number, deltaMs: number): void {
    if (this.runEnded) return;
    const deltaSeconds = deltaMs / 1000;

    const gas = Boolean(this.cursors?.right.isDown) || Boolean(this.keyD?.isDown) || this.touchGas;
    const brake = Boolean(this.cursors?.left.isDown) || Boolean(this.keyA?.isDown) || this.touchBrake;

    this.vehicle.applyInput({ gas, brake });
    this.vehicle.render();
    this.trickDetector.update(deltaSeconds);

    this.distanceMeters = Math.max(
      this.distanceMeters,
      (this.vehicle.chassis.position.x - this.startX) / PIXELS_PER_METER,
    );

    this.fuelSystem.drain(deltaSeconds, gas);
    const outOfFuel = this.fuelSystem.updateStoppedTimer(deltaSeconds, this.vehicle.speed);
    if (outOfFuel) {
      this.endRun("out-of-fuel");
      return;
    }

    const camera = this.cameras.main;
    this.cameraController.update(deltaSeconds);
    this.parallax.update(camera);

    const worldRight = camera.scrollX + camera.width / camera.zoom;
    this.fuelSystem.update(this.distanceMeters, worldRight);
    this.coinSystem.update(this.distanceMeters, worldRight);

    this.terrain.update(camera.scrollX - 200, worldRight);

    const collectRadius = 46;
    const collectedFuel = this.fuelSystem.collectOverlapping(
      this.vehicle.chassis.position.x,
      this.vehicle.chassis.position.y,
      collectRadius,
    );
    for (const _pickup of collectedFuel) this.fuelSystem.refill(40);

    this.coinSystem.collectOverlapping(
      this.vehicle.chassis.position.x,
      this.vehicle.chassis.position.y,
      collectRadius,
    );

    if (this.distanceMeters >= this.nextCheckpointDistance) {
      this.nextCheckpointDistance += CHECKPOINT_BALANCE.everyMeters;
      this.fuelSystem.refill(CHECKPOINT_BALANCE.fuelBonusUnits);
    }
  }

  private onTrick(event: TrickEvent): void {
    this.trickBonusCoins += event.coins;
    this.coinSystem.addBonusCoins(event.coins);
    showFloatingText(
      this,
      this.vehicle.chassis.position.x,
      this.vehicle.chassis.position.y - 60,
      event.label,
    );
  }

  getHudSnapshot(): {
    distanceMeters: number;
    fuelRatio: number;
    coins: number;
  } {
    return {
      distanceMeters: this.distanceMeters,
      fuelRatio: this.fuelSystem?.ratio ?? 1,
      coins: this.coinSystem?.collectedTotal ?? 0,
    };
  }

  private endRun(reason: "crashed" | "out-of-fuel"): void {
    if (this.runEnded) return;
    this.runEnded = true;

    const results: RunResults = {
      distanceMeters: Math.round(this.distanceMeters),
      coinsCollected: this.coinSystem.collectedTotal,
      trickBonusCoins: this.trickBonusCoins,
      reason,
      isNewRecord: false,
    };

    // Clean up physics-owned resources before the scene shuts down: Phaser's Matter plugin
    // destroys its own world in response to the same SHUTDOWN event, and listener order isn't
    // guaranteed, so we tear our systems down explicitly here rather than relying on it.
    this.cleanup();
    this.scene.stop("HUDScene");
    this.scene.start("ResultsScene", results);
  }

  private cleanedUp = false;
  private cleanup(): void {
    if (this.cleanedUp) return;
    this.cleanedUp = true;
    this.terrain?.destroy();
    this.fuelSystem?.destroy();
    this.coinSystem?.destroy();
    this.parallax?.destroy();
  }
}
