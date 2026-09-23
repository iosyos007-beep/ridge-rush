import Phaser from "phaser";
import type { StageConfig } from "../config/stages.ts";
import { TerrainHeightField } from "./TerrainHeightField.ts";
import { TERRAIN_LABEL } from "../entities/Vehicle.ts";

const SAMPLE_STEP = 24;
const CHUNK_WIDTH = SAMPLE_STEP * 20;
const GROUND_DEPTH = 2000;

interface TerrainChunk {
  startX: number;
  endX: number;
  body: MatterJS.BodyType;
  graphics: Phaser.GameObjects.Graphics;
}

/**
 * Streams terrain chunks in/out around the camera. Each chunk is a set of static Matter
 * bodies built from convex quads between consecutive height samples (avoiding concave
 * polygon physics issues), plus matching filled Graphics with a surface stripe.
 */
export class TerrainGenerator {
  private readonly scene: Phaser.Scene;
  private readonly stage: StageConfig;
  private readonly heightField: TerrainHeightField;
  private readonly chunks: TerrainChunk[] = [];
  private nextChunkStartX = 0;
  private furthestGeneratedX = 0;

  constructor(scene: Phaser.Scene, stage: StageConfig) {
    this.scene = scene;
    this.stage = stage;
    this.heightField = new TerrainHeightField(stage);
  }

  /** Returns the ground height (px, positive = up from baseline) at a given world x. */
  heightAt(x: number): number {
    return this.heightField.heightAt(x);
  }

  /** Call once at level start to build initial chunks around the spawn point. */
  primeAround(x: number, aheadDistance = CHUNK_WIDTH * 3): void {
    this.nextChunkStartX = Math.floor((x - CHUNK_WIDTH) / SAMPLE_STEP) * SAMPLE_STEP;
    while (this.furthestGeneratedX < x + aheadDistance) {
      this.generateNextChunk();
    }
  }

  /** Call every frame; generates ahead of and removes chunks behind the given camera x. */
  update(cameraLeftX: number, cameraRightX: number): void {
    while (this.furthestGeneratedX < cameraRightX + CHUNK_WIDTH * 2) {
      this.generateNextChunk();
    }
    const removeBefore = cameraLeftX - CHUNK_WIDTH * 3;
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const chunk = this.chunks[i];
      if (chunk && chunk.endX < removeBefore) {
        this.scene.matter.world.remove(chunk.body);
        chunk.graphics.destroy();
        this.chunks.splice(i, 1);
      }
    }
  }

  private generateNextChunk(): void {
    const startX = this.nextChunkStartX;
    const endX = startX + CHUNK_WIDTH;

    const topPoints: Phaser.Math.Vector2[] = [];
    for (let x = startX; x <= endX; x += SAMPLE_STEP) {
      const h = this.heightField.heightAt(x);
      topPoints.push(new Phaser.Math.Vector2(x, -h));
    }

    // Build one convex quad body per segment between consecutive samples so Matter never
    // has to deal with a large concave polygon.
    const segmentBodies: MatterJS.BodyType[] = [];
    const Bodies = this.scene.matter.bodies;
    for (let i = 0; i < topPoints.length - 1; i++) {
      const a = topPoints[i];
      const b = topPoints[i + 1];
      if (!a || !b) continue;
      const vertices = [
        { x: a.x, y: a.y },
        { x: b.x, y: b.y },
        { x: b.x, y: b.y + GROUND_DEPTH },
        { x: a.x, y: a.y + GROUND_DEPTH },
      ];
      const segment = Bodies.fromVertices(
        (a.x + b.x) / 2,
        (a.y + b.y) / 2 + GROUND_DEPTH / 2,
        [vertices],
        {
          isStatic: true,
          label: TERRAIN_LABEL,
          friction: this.stage.groundFriction,
        },
      );
      segmentBodies.push(segment);
    }

    const compound = this.scene.matter.body.create({
      parts: segmentBodies,
      isStatic: true,
      label: TERRAIN_LABEL,
      friction: this.stage.groundFriction,
    });
    this.scene.matter.world.add(compound);

    const graphics = this.scene.add.graphics();
    graphics.setDepth(1);
    this.drawChunk(graphics, topPoints, endX);

    this.chunks.push({ startX, endX, body: compound, graphics });
    this.nextChunkStartX = endX;
    this.furthestGeneratedX = endX;
  }

  private drawChunk(
    graphics: Phaser.GameObjects.Graphics,
    topPoints: Phaser.Math.Vector2[],
    endX: number,
  ): void {
    const firstPoint = topPoints[0];
    if (!firstPoint) return;

    // Dirt body fill.
    graphics.fillStyle(this.stage.groundColor, 1);
    graphics.beginPath();
    graphics.moveTo(firstPoint.x, firstPoint.y + GROUND_DEPTH);
    for (const p of topPoints) graphics.lineTo(p.x, p.y);
    graphics.lineTo(endX, firstPoint.y + GROUND_DEPTH);
    graphics.closePath();
    graphics.fillPath();

    // Scattered pebble/crater texture on the dirt, like the reference's mottled ground.
    const darkDirt = Phaser.Display.Color.ValueToColor(this.stage.groundColor).darken(15).color;
    graphics.fillStyle(darkDirt, 0.5);
    const chunkStartX = topPoints[0]?.x ?? 0;
    const chunkWidth = endX - chunkStartX;
    const pebbleCount = Math.round(chunkWidth / 26);
    for (let i = 0; i < pebbleCount; i++) {
      const t = (i + 0.5) / pebbleCount;
      const x = chunkStartX + t * chunkWidth + (Math.sin(i * 12.9898) * 8);
      const sampleIndex = Math.min(topPoints.length - 1, Math.floor(t * (topPoints.length - 1)));
      const topY = topPoints[sampleIndex]?.y ?? firstPoint.y;
      const depth = 18 + (Math.abs(Math.sin(i * 78.233)) * 55);
      const radius = 4 + Math.abs(Math.sin(i * 4.51)) * 5;
      graphics.fillCircle(x, topY + depth, radius);
    }

    // Grass cap: a thick colored band along the surface with small tufts poking up.
    graphics.lineStyle(10, this.stage.surfaceColor, 1);
    graphics.beginPath();
    graphics.moveTo(firstPoint.x, firstPoint.y);
    for (const p of topPoints) graphics.lineTo(p.x, p.y);
    graphics.strokePath();

    const darkGrass = Phaser.Display.Color.ValueToColor(this.stage.surfaceColor).darken(20).color;
    graphics.lineStyle(3, darkGrass, 0.6);
    graphics.beginPath();
    graphics.moveTo(firstPoint.x, firstPoint.y + 5);
    for (const p of topPoints) graphics.lineTo(p.x, p.y + 5);
    graphics.strokePath();

    graphics.fillStyle(this.stage.surfaceColor, 1);
    for (let i = 0; i < topPoints.length - 1; i += 2) {
      const p = topPoints[i];
      if (!p) continue;
      graphics.fillTriangle(p.x - 5, p.y, p.x + 5, p.y, p.x, p.y - 9);
    }
  }

  destroy(): void {
    for (const chunk of this.chunks) {
      this.scene.matter.world.remove(chunk.body);
      chunk.graphics.destroy();
    }
    this.chunks.length = 0;
  }
}
