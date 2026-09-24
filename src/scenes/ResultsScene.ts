import Phaser from "phaser";
import type { RunResults } from "./GameScene.ts";
import { SaveManager } from "../systems/SaveManager.ts";
import { getVehicleById } from "../config/vehicles.ts";
import { getStageById } from "../config/stages.ts";

/** Shows run stats after a crash or out-of-fuel ending, with Retry/Garage/Stages buttons.
 * Records coins and best-distance (per stage+vehicle) to the SaveManager. */
export class ResultsScene extends Phaser.Scene {
  private saveManager!: SaveManager;

  constructor() {
    super("ResultsScene");
  }

  create(data: RunResults): void {
    const { width, height } = this.scale;
    this.saveManager = new SaveManager();

    this.saveManager.addCoins(data.coinsCollected);
    const isNewRecord = this.saveManager.recordBestDistance(
      data.stageId,
      data.vehicleId,
      data.distanceMeters,
    );
    const bestDistance = this.saveManager.getBestDistance(data.stageId, data.vehicleId);

    this.add.rectangle(0, 0, width, height, 0x0f1a24).setOrigin(0, 0);

    const reasonLabel = data.reason === "crashed" ? "Knocked out!" : "Out of fuel!";
    this.add
      .text(width / 2, height * 0.14, reasonLabel, {
        fontFamily: "Arial, sans-serif",
        fontSize: "36px",
        color: "#ff8c3f",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    if (isNewRecord) {
      this.add
        .text(width / 2, height * 0.14 + 42, "NEW RECORD!", {
          fontFamily: "Arial, sans-serif",
          fontSize: "20px",
          color: "#ffe27a",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
    }

    const vehicleName = getVehicleById(data.vehicleId).name;
    const stageName = getStageById(data.stageId).name;
    const lines = [
      `${vehicleName} \u00b7 ${stageName}`,
      `Distance: ${data.distanceMeters} m  (Best: ${Math.round(bestDistance)} m)`,
      `Coins collected: ${data.coinsCollected}${data.trickBonusCoins > 0 ? ` (incl. ${data.trickBonusCoins} trick bonus)` : ""}`,
      `Total coins: ${this.saveManager.getData().coins}`,
    ];
    this.add
      .text(width / 2, height * 0.34, lines.join("\n"), {
        fontFamily: "Arial, sans-serif",
        fontSize: "19px",
        color: "#ffffff",
        align: "center",
        lineSpacing: 10,
      })
      .setOrigin(0.5);

    this.createButton(width / 2, height * 0.6, "RETRY", 0xe0663f, () => {
      this.scene.start("GameScene", { vehicleId: data.vehicleId, stageId: data.stageId });
    });
    this.createButton(width / 2, height * 0.6 + 74, "GARAGE", 0x2b3a4a, () => {
      this.scene.start("GarageScene");
    });
    this.createButton(width / 2, height * 0.6 + 148, "STAGES", 0x2b3a4a, () => {
      this.scene.start("StageSelectScene", { vehicleId: data.vehicleId });
    });
  }

  private createButton(x: number, y: number, label: string, color: number, onClick: () => void): void {
    const button = this.add
      .rectangle(x, y, 220, 58, color)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, {
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    button.on("pointerdown", onClick);
  }
}
