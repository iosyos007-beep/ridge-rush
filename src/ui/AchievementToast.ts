import Phaser from "phaser";
import type { AchievementDef } from "../config/achievements.ts";

/** Shows a brief top-of-screen toast for each newly-unlocked achievement (stacked if more
 * than one unlocks at once), auto-fading after a couple of seconds. Purely cosmetic —
 * callers don't need to wait for it or clean it up. */
export function showAchievementToasts(scene: Phaser.Scene, achievements: AchievementDef[]): void {
  const { width } = scene.scale;

  achievements.forEach((achievement, index) => {
    const y = 70 + index * 46;
    const container = scene.add.container(width / 2, -40);
    container.setDepth(1000);

    const bg = scene.add
      .rectangle(0, 0, 320, 40, 0x1e3a2c)
      .setStrokeStyle(2, 0x4a9a5f);
    const text = scene.add
      .text(0, 0, `\ud83c\udfc6 ${achievement.name}! +${achievement.coinReward}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        color: "#ffe27a",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    container.add([bg, text]);

    scene.tweens.add({
      targets: container,
      y,
      duration: 300,
      ease: "Back.Out",
      delay: index * 120,
      onComplete: () => {
        scene.tweens.add({
          targets: container,
          alpha: 0,
          duration: 400,
          delay: 2200,
          onComplete: () => container.destroy(),
        });
      },
    });
  });
}
