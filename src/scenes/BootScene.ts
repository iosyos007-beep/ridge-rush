import Phaser from "phaser";

/** Minimal boot scene: no external assets to load yet (all visuals are procedural), so it
 * just hands off to the main menu immediately. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.scene.start("MenuScene");
  }
}
