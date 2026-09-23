import Phaser from "phaser";
import type { GameScene } from "./GameScene.ts";

/** Renders the heads-up display (distance, fuel gauge with can icon, coin counter, pause
 * button) and the touch pedal buttons, running in parallel with `GameScene`. Reads run state
 * each frame via `GameScene.getHudSnapshot()` and writes touch input back via
 * `touchGas`/`touchBrake`. Visual style: bold black outlines and chunky icon badges,
 * matching the game's cartoon look. */
export class HUDScene extends Phaser.Scene {
  private gameScene!: GameScene;

  private distanceText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private fuelBarFill!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: "HUDScene" });
  }

  create(): void {
    this.gameScene = this.scene.get("GameScene") as GameScene;
    const { width, height } = this.scale;

    this.drawFuelIcon(30, 26);
    this.add.rectangle(56, 26, 130, 22, 0x1a1a1a).setOrigin(0, 0.5).setScrollFactor(0);
    this.add.rectangle(59, 26, 124, 16, 0xffffff).setOrigin(0, 0.5).setScrollFactor(0);
    this.fuelBarFill = this.add
      .rectangle(59, 26, 124, 16, 0x8fe24a)
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    this.drawCoinIcon(30, 64);
    this.coinText = this.add
      .text(56, 64, "0", {
        fontFamily: "Arial, sans-serif",
        fontSize: "24px",
        color: "#ffffff",
        stroke: "#1a1a1a",
        strokeThickness: 5,
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);

    this.distanceText = this.add
      .text(width / 2, 20, "0 m", {
        fontFamily: "Arial, sans-serif",
        fontSize: "28px",
        color: "#ffffff",
        stroke: "#1a1a1a",
        strokeThickness: 6,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    this.createPedal(width - 100, height - 90, "BRAKE", "brake");
    this.createPedal(100, height - 90, "GAS", "gas");

    this.drawPauseButton(width - 46, 26);
  }

  /** Draws a chunky red jerry-can icon for the fuel gauge label. */
  private drawFuelIcon(x: number, y: number): void {
    const g = this.add.graphics().setScrollFactor(0);
    g.fillStyle(0x1a1a1a, 1);
    g.fillRoundedRect(x - 14, y - 15, 28, 30, 5);
    g.fillStyle(0xd94f4f, 1);
    g.fillRoundedRect(x - 12, y - 13, 24, 26, 4);
    g.fillStyle(0x2a2a2a, 1);
    g.fillRoundedRect(x - 5, y - 19, 10, 8, 2);
    g.fillStyle(0xffffff, 1);
    g.fillRect(x - 4, y - 6, 8, 14);
  }

  /** Draws a gold coin icon for the coin counter label. */
  private drawCoinIcon(x: number, y: number): void {
    const g = this.add.graphics().setScrollFactor(0);
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(x, y, 15);
    g.fillStyle(0xffd94a, 1);
    g.fillCircle(x, y, 12.5);
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeCircle(x, y, 8.5);
  }

  private drawPauseButton(x: number, y: number): void {
    const button = this.add
      .rectangle(x, y, 48, 48, 0x2b3a4a)
      .setStrokeStyle(4, 0x1a1a1a)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, "II", {
        fontFamily: "Arial, sans-serif",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    button.on("pointerdown", () => this.togglePause());
  }

  private createPedal(x: number, y: number, label: string, kind: "gas" | "brake"): void {
    // Chunky metal panel with a 3x2 bolt grid, echoing the reference's pedal buttons.
    const panelColor = 0x8a94a0;
    const panel = this.add
      .rectangle(x, y, 130, 110, panelColor)
      .setStrokeStyle(5, 0x1a1a1a)
      .setScrollFactor(0)
      .setInteractive();

    const boltGraphics = this.add.graphics().setScrollFactor(0);
    boltGraphics.fillStyle(0x1a1a1a, 1);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const bx = x - 36 + col * 36;
        const by = y - 24 + row * 30;
        boltGraphics.fillCircle(bx, by, 10);
      }
    }
    boltGraphics.fillStyle(panelColor, 1);
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const bx = x - 36 + col * 36;
        const by = y - 24 + row * 30;
        boltGraphics.fillCircle(bx, by, 7);
      }
    }

    this.add
      .text(x, y + 42, label, {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: "#1a1a1a",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const setState = (down: boolean) => {
      if (kind === "gas") this.gameScene.touchGas = down;
      else this.gameScene.touchBrake = down;
      panel.setFillStyle(down ? 0x6f7883 : panelColor);
    };

    panel.on("pointerdown", () => setState(true));
    panel.on("pointerup", () => setState(false));
    panel.on("pointerout", () => setState(false));
  }

  private paused = false;
  private togglePause(): void {
    this.paused = !this.paused;
    if (this.paused) {
      this.scene.pause("GameScene");
    } else {
      this.scene.resume("GameScene");
    }
  }

  override update(): void {
    const snapshot = this.gameScene.getHudSnapshot();
    this.distanceText.setText(`${Math.floor(snapshot.distanceMeters)} m`);
    this.coinText.setText(`${snapshot.coins}`);
    this.fuelBarFill.width = 124 * Phaser.Math.Clamp(snapshot.fuelRatio, 0, 1);
    this.fuelBarFill.setFillStyle(snapshot.fuelRatio < 0.2 ? 0xff5c5c : 0x8fe24a);
  }
}
