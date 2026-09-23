import Phaser from "phaser";
import type { StageConfig } from "../config/stages.ts";

/**
 * Layered parallax hills behind the terrain, for depth without needing to stream infinite
 * background geometry. Each layer is a small procedurally-drawn tile (rendered once to a
 * texture) stretched across a `TileSprite`; scrolling is faked by shifting the tile's
 * texture offset by a fraction of the camera's movement each frame, so it works for
 * arbitrarily long runs without regenerating geometry.
 */
export class ParallaxBackground {
  private readonly layers: { sprite: Phaser.GameObjects.TileSprite; factor: number }[] = [];

  constructor(scene: Phaser.Scene, stage: StageConfig, camera: Phaser.Cameras.Scene2D.Camera) {
    const colors = stage.parallaxColors;
    const factors = [0.15, 0.35, 0.55];
    const heights = [220, 170, 120];

    colors.forEach((color, i) => {
      const factor = factors[i] ?? 0.5;
      const layerHeight = heights[i] ?? 150;
      const textureKey = `parallax-${stage.id}-${i}`;

      if (!scene.textures.exists(textureKey)) {
        const tileWidth = 400;
        const g = scene.add.graphics();
        g.fillStyle(color, 1);
        g.beginPath();
        g.moveTo(0, layerHeight);
        const bumps = 3;
        for (let b = 0; b <= bumps; b++) {
          const x = (b / bumps) * tileWidth;
          const y = layerHeight * (0.35 + 0.25 * Math.sin(b * 2.1 + i));
          g.lineTo(x, y);
        }
        g.lineTo(tileWidth, layerHeight);
        g.closePath();
        g.fillPath();
        g.generateTexture(textureKey, tileWidth, layerHeight);
        g.destroy();
      }

      const sprite = scene.add
        .tileSprite(0, 0, camera.width * 1.5, heights[i] ?? 150, textureKey)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(-10 + i)
        .setAlpha(0.9);
      sprite.y = camera.height - sprite.height - i * 10;
      this.layers.push({ sprite, factor });
    });
  }

  update(camera: Phaser.Cameras.Scene2D.Camera): void {
    for (const layer of this.layers) {
      layer.sprite.tilePositionX = camera.scrollX * layer.factor;
      layer.sprite.y = camera.height - layer.sprite.height + 30;
    }
  }

  destroy(): void {
    for (const layer of this.layers) layer.sprite.destroy();
    this.layers.length = 0;
  }
}
