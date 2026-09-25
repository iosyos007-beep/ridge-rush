import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.ts";
import { MenuScene } from "./scenes/MenuScene.ts";
import { GarageScene } from "./scenes/GarageScene.ts";
import { StageSelectScene } from "./scenes/StageSelectScene.ts";
import { GameScene } from "./scenes/GameScene.ts";
import { HUDScene } from "./scenes/HUDScene.ts";
import { ResultsScene } from "./scenes/ResultsScene.ts";
import { AchievementsScene } from "./scenes/AchievementsScene.ts";
import { DailyChallengesScene } from "./scenes/DailyChallengesScene.ts";
import { SettingsScene } from "./scenes/SettingsScene.ts";
import { PauseMenuScene } from "./scenes/PauseMenuScene.ts";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#0f1a24",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  physics: {
    default: "matter",
    matter: {
      gravity: { x: 0, y: 1 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    MenuScene,
    GarageScene,
    StageSelectScene,
    GameScene,
    HUDScene,
    ResultsScene,
    AchievementsScene,
    DailyChallengesScene,
    SettingsScene,
    PauseMenuScene,
  ],
};

const game = new Phaser.Game(config);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("./sw.js").catch(() => {
      // Offline install is optional and should fail gracefully in unsupported contexts.
    });
  });
}

// Auto-pause when the tab loses focus (spec requirement); resumed manually via the pause
// button rather than automatically, to avoid surprising the player.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    game.scene.scenes.forEach((scene) => {
      if (scene.scene.key === "GameScene" && scene.scene.isActive()) {
        scene.scene.pause();
      }
    });
  }
});
