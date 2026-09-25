import Phaser from "phaser";
import { getAudioManager } from "../systems/AudioManager.ts";

export class PauseMenuScene extends Phaser.Scene {
  constructor() {
    super("PauseMenuScene");
  }

  create(data?: { vehicleId?: string; stageId?: string }): void {
    const { width, height } = this.scale;
    const audio = getAudioManager();

    this.add.rectangle(width / 2, height / 2, 420, 360, 0x102232, 0.95).setStrokeStyle(4, 0x9bc7ff);
    this.add.text(width / 2, height / 2 - 120, "PAUSED", {
      fontFamily: "Arial, sans-serif",
      fontSize: "38px",
      color: "#ffe27a",
      fontStyle: "bold",
    }).setOrigin(0.5);

    const resume = this.add.rectangle(width / 2, height / 2 - 30, 240, 52, 0x4a9a5f).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height / 2 - 30, "RESUME", {
      fontFamily: "Arial, sans-serif",
      fontSize: "22px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);
    resume.on("pointerdown", () => {
      audio.playUiClick();
      this.scene.stop("PauseMenuScene");
      this.scene.resume("GameScene");
    });

    const settings = this.add.rectangle(width / 2, height / 2 + 40, 240, 52, 0x2b3a4a).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height / 2 + 40, "SETTINGS", {
      fontFamily: "Arial, sans-serif",
      fontSize: "22px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);
    settings.on("pointerdown", () => {
      audio.playUiClick();
      this.scene.stop("PauseMenuScene");
      this.scene.pause("GameScene");
      this.scene.start("SettingsScene");
    });

    const restart = this.add.rectangle(width / 2, height / 2 + 110, 240, 52, 0xe0663f).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height / 2 + 110, "RESTART", {
      fontFamily: "Arial, sans-serif",
      fontSize: "22px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);
    restart.on("pointerdown", () => {
      audio.playUiClick();
      this.scene.stop("PauseMenuScene");
      this.scene.stop("HUDScene");
      const vehicleId = data?.vehicleId ?? "starter-jeep";
      const stageId = data?.stageId ?? "green-hills";
      this.scene.start("GameScene", { vehicleId, stageId });
    });

    const garage = this.add.rectangle(width / 2, height / 2 + 180, 240, 52, 0x2b3a4a).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height / 2 + 180, "GARAGE", {
      fontFamily: "Arial, sans-serif",
      fontSize: "22px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);
    garage.on("pointerdown", () => {
      audio.playUiClick();
      this.scene.stop("PauseMenuScene");
      this.scene.stop("HUDScene");
      this.scene.stop("GameScene");
      this.scene.start("GarageScene");
    });
  }
}
