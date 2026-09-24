import Phaser from "phaser";

/** Simple title screen with a single Play button, routing into the Garage to pick a
 * vehicle before choosing a stage. */
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
    playButton.on("pointerdown", () => this.scene.start("GarageScene"));

    const navY = height * 0.62 + 62;
    this.createNavButton(width / 2 - 118, navY, "ACHIEVEMENTS", () => this.scene.start("AchievementsScene"));
    this.createNavButton(width / 2 + 118, navY, "DAILY CHALLENGES", () => this.scene.start("DailyChallengesScene"));

    this.add
      .text(width / 2, height * 0.78, "Right/D or GAS button = accelerate | Left/A or BRAKE = reverse", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        color: "#9fb4c9",
      })
      .setOrigin(0.5);
  }

  private createNavButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add
      .rectangle(x, y, 220, 40, 0x2b3a4a)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#cfe8ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    button.on("pointerover", () => button.setFillStyle(0x38495c));
    button.on("pointerout", () => button.setFillStyle(0x2b3a4a));
    button.on("pointerdown", onClick);
  }
}
