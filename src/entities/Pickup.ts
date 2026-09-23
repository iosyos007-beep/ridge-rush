import Phaser from "phaser";

export type PickupKind = "fuel" | "coin";

/**
 * A simple collectible: a sensor circle body plus a Graphics visual (and, for coins, a value
 * label). Not driven by full rigid-body physics (it's a static sensor), just detected via
 * overlap checks in the owning system, so pickups never physically interact with the vehicle.
 */
export class Pickup {
  readonly body: MatterJS.BodyType;
  readonly kind: PickupKind;
  readonly value: number;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly label?: Phaser.GameObjects.Text;
  private collected = false;

  constructor(scene: Phaser.Scene, kind: PickupKind, value: number, x: number, y: number) {
    this.kind = kind;
    this.value = value;
    this.body = scene.matter.bodies.circle(x, y, kind === "coin" ? 13 : 15, {
      isStatic: true,
      isSensor: true,
      label: `pickup-${kind}`,
    });
    this.body.plugin = { pickup: this };
    scene.matter.world.add(this.body);

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(5);

    if (kind === "coin") {
      this.label = scene.add
        .text(x, y, String(value), {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          color: "#7a5a00",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setDepth(6);
    }

    this.draw();
  }

  private draw(): void {
    const g = this.graphics;
    const { x, y } = this.body.position;
    const outline = 0x1a1a1a;
    g.clear();
    if (this.kind === "coin") {
      const color = this.value >= 500 ? 0xff5fd1 : this.value >= 100 ? 0xffd94a : 0xffe27a;
      g.fillStyle(outline, 1);
      g.fillCircle(x, y, 13);
      g.fillStyle(color, 1);
      g.fillCircle(x, y, 11);
      g.lineStyle(2, 0xffffff, 0.9);
      g.strokeCircle(x, y, 7.5);
    } else {
      // Red fuel can with a dark cap and a white "fuel level" stripe, echoing the reference.
      g.fillStyle(outline, 1);
      g.fillRoundedRect(x - 11, y - 15, 22, 30, 5);
      g.fillStyle(0xd94f4f, 1);
      g.fillRoundedRect(x - 9, y - 13, 18, 26, 4);
      g.fillStyle(0x2a2a2a, 1);
      g.fillRoundedRect(x - 4, y - 19, 8, 7, 2);
      g.fillStyle(0xffffff, 1);
      g.fillRect(x - 3, y - 7, 6, 13);
    }
  }

  get position(): { x: number; y: number } {
    return this.body.position;
  }

  get isCollected(): boolean {
    return this.collected;
  }

  collect(scene: Phaser.Scene): void {
    if (this.collected) return;
    this.collected = true;
    scene.matter.world.remove(this.body);
    this.graphics.destroy();
    this.label?.destroy();
  }
}
