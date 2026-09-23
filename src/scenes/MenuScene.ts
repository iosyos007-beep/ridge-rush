import Phaser from "phaser";
import { STARTER_JEEP } from "../config/vehicles.ts";
import { GREEN_HILLS } from "../config/stages.ts";

/** Simple title screen with a single Play button. Garage/stage-select flow is added in a
 * later phase; for the Phase 1 MVP the only run available is the starter vehicle on the
 * default stage. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .rectangle(0, 0, width, height, 0x1c2b3a)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.add
      .text(width / 2, height * 0.32, "RIDGE RUSH", {
        fontFamily: "Arial, sans-serif",
        fontSize: "56px",
        color: "#ffe27a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.32 + 56, "An original 2D hill-climb driving game", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: "#cfe8ff",
      })
      .setOrigin(0.5);

    const playButton = this.add
      .rectangle(width / 2, height * 0.62, 220, 70, 0xe0663f)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2, height * 0.62, "PLAY", {
        fontFamily: "Arial, sans-serif",
        fontSize: "32px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    playButton.on("pointerover", () => playButton.setFillStyle(0xf07a52));
    playButton.on("pointerout", () => playButton.setFillStyle(0xe0663f));
    playButton.on("pointerdown", () => this.startRun());

    this.add
      .text(width / 2, height * 0.78, "Right/D or GAS button = accelerate | Left/A or BRAKE = reverse", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        color: "#9fb4c9",
      })
      .setOrigin(0.5);
  }

  private startRun(): void {
    this.scene.start("GameScene", { vehicleId: STARTER_JEEP.id, stageId: GREEN_HILLS.id });
  }
}
