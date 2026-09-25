import Phaser from "phaser";
import { SaveManager } from "../systems/SaveManager.ts";
import { getAudioManager } from "../systems/AudioManager.ts";

export class SettingsScene extends Phaser.Scene {
  private saveManager!: SaveManager;

  constructor() {
    super("SettingsScene");
  }

  create(): void {
    this.saveManager = new SaveManager();
    const { width, height } = this.scale;
    const audio = getAudioManager();
    audio.unlock();

    this.add.rectangle(0, 0, width, height, 0x162434).setOrigin(0, 0).setAlpha(0.94);

    this.add.text(width / 2, 60, "SETTINGS", {
      fontFamily: "Arial, sans-serif",
      fontSize: "40px",
      color: "#ffe27a",
      fontStyle: "bold",
    }).setOrigin(0.5);

    const settings = this.saveManager.getSettings();
    const rows: { label: string; value: number | boolean; onToggle?: () => void; onAdjust?: (delta: number) => void }[] = [
      { label: `Music: ${settings.musicVolume.toFixed(1)}`, value: settings.musicVolume },
      { label: `SFX: ${settings.sfxVolume.toFixed(1)}`, value: settings.sfxVolume },
      { label: `Music muted: ${settings.musicMuted ? "ON" : "OFF"}`, value: settings.musicMuted, onToggle: () => {
          const next = !settings.musicMuted;
          audio.setMusicMuted(next, this.saveManager);
          this.scene.restart();
        } },
      { label: `SFX muted: ${settings.sfxMuted ? "ON" : "OFF"}`, value: settings.sfxMuted, onToggle: () => {
          const next = !settings.sfxMuted;
          audio.setSfxMuted(next, this.saveManager);
          this.scene.restart();
        } },
      { label: `Swap pedals: ${settings.swapPedals ? "ON" : "OFF"}`, value: settings.swapPedals, onToggle: () => {
          this.saveManager.updateSettings({ swapPedals: !settings.swapPedals });
          this.scene.restart();
        } },
      { label: `Particles: ${settings.particlesEnabled ? "ON" : "OFF"}`, value: settings.particlesEnabled, onToggle: () => {
          this.saveManager.updateSettings({ particlesEnabled: !settings.particlesEnabled });
          this.scene.restart();
        } },
    ];

    const startY = 130;
    rows.forEach((row, index) => {
      const y = startY + index * 62;
      const rowBg = this.add.rectangle(width / 2, y, 420, 42, 0x2b3a4a).setInteractive({ useHandCursor: true });
      const label = this.add.text(width / 2 - 110, y, row.label, {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: "#dfeaf7",
        fontStyle: "bold",
      }).setOrigin(0, 0.5);

      const minus = this.add.rectangle(width / 2 + 120, y, 32, 32, 0x495d73).setInteractive({ useHandCursor: true });
      this.add.text(width / 2 + 120, y, "-", { fontFamily: "Arial, sans-serif", fontSize: "26px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
      const plus = this.add.rectangle(width / 2 + 170, y, 32, 32, 0x495d73).setInteractive({ useHandCursor: true });
      this.add.text(width / 2 + 170, y, "+", { fontFamily: "Arial, sans-serif", fontSize: "26px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);

      rowBg.on("pointerdown", () => {
        if (row.onToggle) {
          row.onToggle();
        } else {
          audio.playUiClick();
        }
      });
      minus.on("pointerdown", () => {
        const delta = row.label.startsWith("Music") || row.label.startsWith("SFX") ? -0.1 : 0;
        if (delta === 0) return;
        if (row.label.startsWith("Music")) {
          const next = Phaser.Math.Clamp(settings.musicVolume + delta, 0, 1);
          audio.setMusicVolume(next, this.saveManager);
        } else {
          const next = Phaser.Math.Clamp(settings.sfxVolume + delta, 0, 1);
          audio.setSfxVolume(next, this.saveManager);
        }
        this.scene.restart();
      });
      plus.on("pointerdown", () => {
        const delta = row.label.startsWith("Music") || row.label.startsWith("SFX") ? 0.1 : 0;
        if (delta === 0) return;
        if (row.label.startsWith("Music")) {
          const next = Phaser.Math.Clamp(settings.musicVolume + delta, 0, 1);
          audio.setMusicVolume(next, this.saveManager);
        } else {
          const next = Phaser.Math.Clamp(settings.sfxVolume + delta, 0, 1);
          audio.setSfxVolume(next, this.saveManager);
        }
        this.scene.restart();
      });

      this.add.existing(label);
    });

    const resetButton = this.add.rectangle(width / 2, height - 90, 260, 52, 0xe0663f).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height - 90, "RESET PROGRESS", {
      fontFamily: "Arial, sans-serif",
      fontSize: "20px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);
    resetButton.on("pointerdown", () => {
      audio.playUiClick();
      const confirmed = window.confirm("Reset all progress, unlocks, and coins?");
      if (!confirmed) return;
      this.saveManager.resetProgress();
      this.scene.start("MenuScene");
    });

    const backButton = this.add.rectangle(width / 2, height - 30, 180, 44, 0x2b3a4a).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height - 30, "BACK", {
      fontFamily: "Arial, sans-serif",
      fontSize: "18px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);
    backButton.on("pointerdown", () => {
      audio.playUiClick();
      this.scene.start("MenuScene");
    });
  }
}
