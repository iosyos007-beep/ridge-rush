import Phaser from "phaser";
import { getOrCreateDailyChallenges } from "../systems/ChallengeManager.ts";
import { SaveManager } from "../systems/SaveManager.ts";

/** Shows today's 3 deterministically-generated daily challenges with progress bars and
 * coin rewards. Challenges reset (and regenerate) automatically at local midnight. */
export class DailyChallengesScene extends Phaser.Scene {
  private saveManager!: SaveManager;

  constructor() {
    super("DailyChallengesScene");
  }

  create(): void {
    this.saveManager = new SaveManager();
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x0f1a24).setOrigin(0, 0);

    this.add
      .text(width / 2, 40, "DAILY CHALLENGES", {
        fontFamily: "Arial, sans-serif",
        fontSize: "26px",
        color: "#ffe27a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 70, "New challenges every day \u2014 progress carries across runs.", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#9fb4c9",
      })
      .setOrigin(0.5);

    const challenges = getOrCreateDailyChallenges(this.saveManager);
    const state = this.saveManager.getDailyChallengeState();

    const cardWidth = Math.min(width - 60, 480);
    const cardHeight = 90;
    const gap = 16;
    const startY = 110;

    challenges.forEach((challenge, index) => {
      const y = startY + index * (cardHeight + gap) + cardHeight / 2;
      const completed = state.completedIds.includes(challenge.id);
      const progress = state.progressById[challenge.id] ?? 0;
      const ratio = Phaser.Math.Clamp(progress / challenge.target, 0, 1);

      this.add
        .rectangle(width / 2, y, cardWidth, cardHeight, 0x16222f)
        .setStrokeStyle(3, completed ? 0x4a9a5f : 0x2b3a4a);

      this.add
        .text(width / 2 - cardWidth / 2 + 18, y - cardHeight / 2 + 14, challenge.description, {
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0, 0);

      this.add
        .text(width / 2 + cardWidth / 2 - 18, y - cardHeight / 2 + 14, `+${challenge.coinReward}`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "15px",
          color: "#ffe27a",
          fontStyle: "bold",
        })
        .setOrigin(1, 0);

      const barX = width / 2 - cardWidth / 2 + 18;
      const barY = y + cardHeight / 2 - 26;
      const barWidth = cardWidth - 36;
      this.add.rectangle(barX, barY, barWidth, 14, 0x0f1a24).setOrigin(0, 0.5).setStrokeStyle(1, 0x2b3a4a);
      this.add
        .rectangle(barX, barY, barWidth * ratio, 14, completed ? 0x4a9a5f : 0xe0663f)
        .setOrigin(0, 0.5);

      this.add
        .text(barX + barWidth, barY - 12, completed ? "Complete!" : `${Math.floor(progress)} / ${challenge.target}`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          color: completed ? "#7fd894" : "#9fb4c9",
        })
        .setOrigin(1, 1);
    });

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
  }
}
