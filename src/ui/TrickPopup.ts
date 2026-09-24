import Phaser from "phaser";

/** Spawns a floating text label at a world position that drifts upward and fades out, then
 * destroys itself. Used for trick bonus popups ("Back Flip! +500"). */
export function showFloatingText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = "#ffe27a",
): void {
  const label = scene.add
    .text(x, y, text, {
      fontFamily: "Arial, sans-serif",
      fontSize: "22px",
      color,
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(50);

  scene.tweens.add({
    targets: label,
    y: y - 70,
    alpha: 0,
    duration: 1100,
    ease: "Cubic.Out",
    onComplete: () => label.destroy(),
  });
}
