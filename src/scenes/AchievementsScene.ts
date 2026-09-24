import Phaser from "phaser";
import { ACHIEVEMENTS } from "../config/achievements.ts";
import { SaveManager } from "../systems/SaveManager.ts";

/** Read-only list of all achievements, showing unlocked/locked state and coin rewards.
 * Scrollable so it works on any viewport height, reusing the same masked-container +
 * wheel/drag-scroll pattern as `GarageScene`. */
export class AchievementsScene extends Phaser.Scene {
  private saveManager!: SaveManager;
  private scrollContainer?: Phaser.GameObjects.Container;
  private scrollMaskShape?: Phaser.GameObjects.Graphics;

  constructor() {
    super("AchievementsScene");
  }

  create(): void {
    this.saveManager = new SaveManager();
    this.buildUI();
  }

  private buildUI(): void {
    this.children.removeAll(true);
    this.scrollMaskShape?.destroy();
    this.scrollMaskShape = undefined;
    this.scrollContainer = undefined;

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x0f1a24).setOrigin(0, 0);

    this.add
      .text(24, 22, "ACHIEVEMENTS", {
        fontFamily: "Arial, sans-serif",
        fontSize: "26px",
        color: "#ffe27a",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    const unlockedCount = ACHIEVEMENTS.filter((a) => this.saveManager.isAchievementUnlocked(a.id)).length;
    this.add
      .text(width - 24, 22, `${unlockedCount} / ${ACHIEVEMENTS.length}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        color: "#9fb4c9",
      })
      .setOrigin(1, 0.5);

    const backY = 56;
    const backButton = this.add
      .rectangle(width / 2, height - 40, 200, 52, 0x2b3a4a)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2, height - 40, "BACK", {
        fontFamily: "Arial, sans-serif",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    backButton.on("pointerdown", () => this.scene.start("MenuScene"));

    const listTop = backY;
    const listHeight = height - backY - 70;
    this.buildScrollableList(width, listTop, listHeight);
  }

  private buildScrollableList(width: number, top: number, areaHeight: number): void {
    const maxScrollRef = { value: 0 };
    const zone = this.add.zone(width / 2, top + areaHeight / 2, width, areaHeight).setInteractive();

    zone.on("wheel", (_pointer: Phaser.Input.Pointer, _dx: number, dy: number) => {
      if (!this.scrollContainer) return;
      const nextOffset = Phaser.Math.Clamp(this.scrollContainer.y - top - dy * 0.5, -maxScrollRef.value, 0);
      this.scrollContainer.y = top + nextOffset;
    });
    let dragStartY = 0;
    let containerStartY = 0;
    zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      dragStartY = pointer.y;
      containerStartY = this.scrollContainer?.y ?? top;
    });
    zone.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || !this.scrollContainer) return;
      const delta = pointer.y - dragStartY;
      const nextOffset = Phaser.Math.Clamp(containerStartY - top + delta, -maxScrollRef.value, 0);
      this.scrollContainer.y = top + nextOffset;
    });

    const container = this.add.container(0, top);
    this.scrollContainer = container;
    let cursorY = 10;
    const rowHeight = 62;

    for (const achievement of ACHIEVEMENTS) {
      const unlocked = this.saveManager.isAchievementUnlocked(achievement.id);
      const rowBg = this.add
        .rectangle(width / 2, cursorY + rowHeight / 2 - 6, width - 48, rowHeight - 10, unlocked ? 0x1e3a2c : 0x16222f)
        .setStrokeStyle(2, unlocked ? 0x4a9a5f : 0x2b3a4a);
      container.add(rowBg);

      const icon = unlocked ? "\ud83c\udfc6" : "\ud83d\udd12";
      const nameText = this.add
        .text(40, cursorY + 2, `${icon} ${achievement.name}`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "17px",
          color: unlocked ? "#ffe27a" : "#9fb4c9",
          fontStyle: "bold",
        })
        .setOrigin(0, 0);
      container.add(nameText);

      const descText = this.add
        .text(40, cursorY + 26, achievement.description, {
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          color: "#77879a",
        })
        .setOrigin(0, 0);
      container.add(descText);

      const rewardText = this.add
        .text(width - 40, cursorY + 12, `+${achievement.coinReward}`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          color: "#ffe27a",
          fontStyle: "bold",
        })
        .setOrigin(1, 0);
      container.add(rewardText);

      cursorY += rowHeight;
    }

    const maskShape = this.make.graphics({});
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, top, width, areaHeight);
    this.scrollMaskShape = maskShape;
    container.setMask(maskShape.createGeometryMask());
    maxScrollRef.value = Math.max(0, cursorY - areaHeight);
  }
}
