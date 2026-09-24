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
  ],
};

const game = new Phaser.Game(config);

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
