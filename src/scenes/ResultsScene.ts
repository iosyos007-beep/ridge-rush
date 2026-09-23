import Phaser from "phaser";
import type { RunResults } from "./GameScene.ts";
import { SaveManager } from "../systems/SaveManager.ts";
import { STARTER_JEEP } from "../config/vehicles.ts";
import { GREEN_HILLS } from "../config/stages.ts";

/** Shows run stats after a crash or out-of-fuel ending, with Retry/Menu buttons. Records
 * coins and best-distance to the SaveManager. */
export class ResultsScene extends Phaser.Scene {
  private saveManager = new SaveManager();

  constructor() {
    super("ResultsScene");
  }

  create(data: RunResults): void {
    const { width, height } = this.scale;

    this.saveManager.addCoins(data.coinsCollected);
    const isNewRecord = this.saveManager.recordBestDistance(
      GREEN_HILLS.id,
      STARTER_JEEP.id,
      data.distanceMeters,
    );
    const bestDistance = this.saveManager.getBestDistance(GREEN_HILLS.id, STARTER_JEEP.id);

    this.add.rectangle(0, 0, width, height, 0x0f1a24).setOrigin(0, 0);

    const reasonLabel = data.reason === "crashed" ? "Knocked out!" : "Out of fuel!";
    this.add
      .text(width / 2, height * 0.18, reasonLabel, {
        fontFamily: "Arial, sans-serif",
        fontSize: "40px",
        color: "#ff8c3f",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    if (isNewRecord) {
      this.add
        .text(width / 2, height * 0.18 + 46, "NEW RECORD!", {
          fontFamily: "Arial, sans-serif",
          fontSize: "22px",
          color: "#ffe27a",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
    }

    const lines = [
      `Distance: ${data.distanceMeters} m  (Best: ${Math.round(bestDistance)} m)`,
      `Coins collected: ${data.coinsCollected}`,
      `Total coins: ${this.saveManager.getData().coins}`,
    ];
    this.add
      .text(width / 2, height * 0.4, lines.join("\n"), {
        fontFamily: "Arial, sans-serif",
        fontSize: "20px",
        color: "#ffffff",
        align: "center",
        lineSpacing: 10,
      })
      .setOrigin(0.5);

    this.createButton(width / 2, height * 0.65, "RETRY", 0xe0663f, () => {
      this.scene.start("GameScene", { vehicleId: STARTER_JEEP.id, stageId: GREEN_HILLS.id });
    });
    this.createButton(width / 2, height * 0.65 + 80, "MENU", 0x2b3a4a, () => {
      this.scene.start("MenuScene");
    });
  }

  private createButton(x: number, y: number, label: string, color: number, onClick: () => void): void {
    const button = this.add
      .rectangle(x, y, 220, 60, color)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, {
        fontFamily: "Arial, sans-serif",
        fontSize: "24px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    button.on("pointerdown", onClick);
  }
}
