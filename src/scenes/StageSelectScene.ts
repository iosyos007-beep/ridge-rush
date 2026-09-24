import Phaser from "phaser";
import { STAGES } from "../config/stages.ts";
import { VEHICLES, getVehicleById } from "../config/vehicles.ts";
import { SaveManager } from "../systems/SaveManager.ts";
import { SaveManagerEconomyService } from "../systems/EconomyService.ts";

/** Lets the player choose an unlocked stage (or buy a locked one) for the currently
 * selected vehicle, showing their personal best distance for each stage+vehicle pair. */
export class StageSelectScene extends Phaser.Scene {
  private saveManager!: SaveManager;
  private economy!: SaveManagerEconomyService;
  private vehicleId = VEHICLES[0]!.id;

  constructor() {
    super("StageSelectScene");
  }

  create(data?: { vehicleId?: string }): void {
    this.saveManager = new SaveManager();
    this.economy = new SaveManagerEconomyService(this.saveManager);
    this.vehicleId = data?.vehicleId ?? this.saveManager.getSelectedVehicleId();
    this.buildUI();
  }

  private buildUI(): void {
    this.children.removeAll(true);
    const { width, height } = this.scale;
    const vehicleName = getVehicleById(this.vehicleId).name;

    this.add.rectangle(0, 0, width, height, 0x0f1a24).setOrigin(0, 0);

    this.add
      .text(24, 22, "STAGE SELECT", {
        fontFamily: "Arial, sans-serif",
        fontSize: "24px",
        color: "#ffe27a",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    this.add
      .text(24, 48, `Driving: ${vehicleName}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#9fb4c9",
      })
      .setOrigin(0, 0.5);

    this.createSmallButton(width - 70, 26, "GARAGE", 0x2b3a4a, () => this.scene.start("GarageScene"));
    this.drawCoinBadge(width - 190, 26, this.saveManager.getData().coins);

    const listTop = 76;
    const rowHeight = Math.min(64, (height - listTop - 20) / STAGES.length);
    STAGES.forEach((stage, i) => {
      this.drawStageRow(24, listTop + i * rowHeight, width - 48, rowHeight - 8, stage);
    });
  }

  private drawStageRow(
    x: number,
    y: number,
    width: number,
    rowHeight: number,
    stage: (typeof STAGES)[number],
  ): void {
    const unlocked = this.saveManager.isStageUnlocked(stage.id);
    const best = this.saveManager.getBestDistance(stage.id, this.vehicleId);

    const bg = this.add
      .rectangle(x, y, width, rowHeight, 0x16222f)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x2b3a4a);

    this.add
      .rectangle(x + 10, y + rowHeight / 2, 14, rowHeight - 16, stage.surfaceColor)
      .setOrigin(0, 0.5);

    this.add
      .text(x + 36, y + rowHeight * 0.32, stage.name, {
        fontFamily: "Arial, sans-serif",
        fontSize: "17px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    this.add
      .text(x + 36, y + rowHeight * 0.68, stage.description, {
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        color: "#9fb4c9",
      })
      .setOrigin(0, 0.5);

    if (unlocked) {
      this.add
        .text(x + width - 320, y + rowHeight / 2, `Best: ${Math.round(best)} m`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          color: "#cfe8ff",
        })
        .setOrigin(0, 0.5);

      const goButton = this.add
        .rectangle(x + width - 90, y + rowHeight / 2, 150, rowHeight - 16, 0xe0663f)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(x + width - 90, y + rowHeight / 2, "DRIVE →", {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      goButton.on("pointerdown", () => {
        this.scene.start("GameScene", { vehicleId: this.vehicleId, stageId: stage.id });
      });
    } else {
      const affordable = this.economy.canAfford(stage.price);
      const buyButton = this.add
        .rectangle(x + width - 90, y + rowHeight / 2, 150, rowHeight - 16, affordable ? 0x4a9a5f : 0x3a4650)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(x + width - 90, y + rowHeight / 2, `UNLOCK\n${stage.price} coins`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          color: "#ffffff",
          fontStyle: "bold",
          align: "center",
        })
        .setOrigin(0.5);
      buyButton.on("pointerdown", () => {
        if (!this.economy.spendCoins(stage.price)) return;
        this.saveManager.unlockStage(stage.id);
        this.buildUI();
      });
    }
    bg.setDepth(-1);
  }

  private drawCoinBadge(x: number, y: number, coins: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(x, y, 12);
    g.fillStyle(0xffd94a, 1);
    g.fillCircle(x, y, 10);
    this.add
      .text(x + 18, y, `${coins}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
  }

  private createSmallButton(x: number, y: number, label: string, color: number, onClick: () => void): void {
    const button = this.add.rectangle(x, y, 90, 32, color).setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    button.on("pointerdown", onClick);
  }
}
