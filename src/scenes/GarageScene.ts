import Phaser from "phaser";
import { VEHICLES, type VehicleConfig } from "../config/vehicles.ts";
import {
  getUpgradesForVehicle,
  getUpgradeCost,
  getEffectiveVehicleConfig,
  UPGRADE_MAX_LEVEL,
  type UpgradeDef,
} from "../config/upgrades.ts";
import { SaveManager } from "../systems/SaveManager.ts";
import { SaveManagerEconomyService } from "../systems/EconomyService.ts";
import { createVehicle } from "../systems/VehicleFactory.ts";
import type { Vehicle } from "../entities/Vehicle.ts";

/** Rough "reasonable max" reference per stat, purely for normalizing the 0..1 stat bars
 * shown in the garage; picking a value comfortably above the highest vehicle+upgrades. */
const STAT_MAX = {
  engineTorque: 0.24,
  maxWheelSpeed: 3.8,
  suspensionStiffness: 0.42,
  tireFriction: 1.4,
  fuelCapacity: 180,
} as const;

/** Vehicle roster + upgrade shop. Lets the player unlock/select a vehicle, buy upgrade
 * levels, preview it idling on a short flat strip of ground, then head to Stage Select. */
export class GarageScene extends Phaser.Scene {
  private saveManager!: SaveManager;
  private economy!: SaveManagerEconomyService;
  private viewIndex = 0;

  private previewVehicle?: Vehicle;
  private previewGroundBody?: MatterJS.BodyType;
  private scrollContainer?: Phaser.GameObjects.Container;
  private scrollMaskShape?: Phaser.GameObjects.Graphics;

  constructor() {
    super("GarageScene");
  }

  create(): void {
    this.saveManager = new SaveManager();
    this.economy = new SaveManagerEconomyService(this.saveManager);

    const savedId = this.saveManager.getSelectedVehicleId();
    const savedIndex = VEHICLES.findIndex((v) => v.id === savedId);
    this.viewIndex = savedIndex >= 0 ? savedIndex : 0;

    this.matter.world.setGravity(0, 1);
    this.buildUI();
  }

  private get viewedVehicle(): VehicleConfig {
    return VEHICLES[this.viewIndex] ?? VEHICLES[0]!;
  }

  private buildUI(): void {
    this.children.removeAll(true);
    this.destroyPreview();
    this.scrollMaskShape?.destroy();
    this.scrollMaskShape = undefined;
    this.scrollContainer = undefined;

    const { width, height } = this.scale;
    const vehicle = this.viewedVehicle;
    const unlocked = this.saveManager.isVehicleUnlocked(vehicle.id);

    this.add.rectangle(0, 0, width, height, 0x0f1a24).setOrigin(0, 0);

    this.add
      .text(24, 22, "GARAGE", {
        fontFamily: "Arial, sans-serif",
        fontSize: "26px",
        color: "#ffe27a",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    this.createSmallButton(width - 70, 26, "BACK", 0x2b3a4a, () => this.scene.start("MenuScene"));

    this.drawCoinBadge(width / 2, 26, this.saveManager.getData().coins);

    // --- Preview panel -------------------------------------------------
    const panelTop = 56;
    const panelHeight = Math.min(height * 0.28, 190);
    this.add
      .rectangle(width / 2, panelTop + panelHeight / 2, width - 40, panelHeight, 0x16222f)
      .setStrokeStyle(3, 0x2b3a4a);

    const previewCenterX = width / 2;
    const previewGroundY = panelTop + panelHeight * 0.72;
    this.spawnPreview(vehicle, previewCenterX, previewGroundY);

    this.createArrowButton(70, panelTop + panelHeight / 2, "<", () => {
      this.viewIndex = (this.viewIndex - 1 + VEHICLES.length) % VEHICLES.length;
      this.buildUI();
    });
    this.createArrowButton(width - 70, panelTop + panelHeight / 2, ">", () => {
      this.viewIndex = (this.viewIndex + 1) % VEHICLES.length;
      this.buildUI();
    });

    // --- Footer: unlock / race button (fixed, drawn before the scroll area so its geometry
    // is known when sizing the scrollable middle region) -------------------
    const footerHeight = 60;
    const footerY = height - footerHeight / 2;
    this.add.rectangle(width / 2, footerY, width, footerHeight, 0x0f1a24).setOrigin(0.5);
    if (unlocked) {
      const isSelected = this.saveManager.getSelectedVehicleId() === vehicle.id;
      this.createButton(width / 2, footerY, isSelected ? "RACE →" : "SELECT & RACE →", 0xe0663f, () => {
        this.saveManager.setSelectedVehicleId(vehicle.id);
        this.scene.start("StageSelectScene", { vehicleId: vehicle.id });
      });
    } else {
      const affordable = this.economy.canAfford(vehicle.price);
      this.createButton(
        width / 2,
        footerY,
        `UNLOCK — ${vehicle.price} coins`,
        affordable ? 0x4a9a5f : 0x3a4650,
        () => {
          if (!this.economy.spendCoins(vehicle.price)) return;
          this.saveManager.unlockVehicle(vehicle.id);
          this.buildUI();
        },
      );
    }

    // --- Scrollable middle region: name/description, stat bars, upgrades ---
    const scrollTop = panelTop + panelHeight + 6;
    const scrollHeight = Math.max(80, height - footerHeight - scrollTop);
    this.buildScrollableContent(vehicle, unlocked, width, scrollTop, scrollHeight);
  }

  /** Lays out the name/description/stat-bars/upgrade-rows inside a masked, scrollable
   * container so the Garage works on any viewport height (mouse wheel or touch-drag to
   * scroll when content is taller than the visible area). */
  private buildScrollableContent(
    vehicle: VehicleConfig,
    unlocked: boolean,
    width: number,
    top: number,
    areaHeight: number,
  ): void {
    // The scroll zone is created first (added to the display list before the content
    // container), so overlapping buttons in the container render on top and still receive
    // clicks first; the zone only "wins" the pointer where no button sits underneath.
    const maxScrollRef = { value: 0 };
    this.setupScrollZone(width, top, areaHeight, maxScrollRef);

    const container = this.add.container(0, top);
    this.scrollContainer = container;
    let cursorY = 0;

    const nameText = this.add
      .text(width / 2, cursorY, vehicle.name, {
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);
    container.add(nameText);
    cursorY += 30;

    const descText = this.add
      .text(width / 2, cursorY, vehicle.description, {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#9fb4c9",
        align: "center",
        wordWrap: { width: width - 80 },
      })
      .setOrigin(0.5, 0);
    container.add(descText);
    cursorY += descText.height + 16;

    const effective = getEffectiveVehicleConfig(vehicle, this.saveManager);
    const stats: Array<[string, number, number]> = [
      ["Engine", effective.engineTorque, STAT_MAX.engineTorque],
      ["Top Speed", effective.maxWheelSpeed, STAT_MAX.maxWheelSpeed],
      ["Suspension", effective.suspensionStiffness, STAT_MAX.suspensionStiffness],
      ["Grip", effective.tireFriction, STAT_MAX.tireFriction],
      ["Fuel Tank", effective.fuelCapacity, STAT_MAX.fuelCapacity],
    ];
    stats.forEach(([label, value, max]) => {
      this.drawStatBar(container, 60, cursorY, width - 120, label, Phaser.Math.Clamp(value / max, 0, 1));
      cursorY += 20;
    });
    cursorY += 14;

    if (unlocked) {
      const upgrades = getUpgradesForVehicle(vehicle);
      upgrades.forEach((upgrade) => {
        this.drawUpgradeRow(container, 60, cursorY, width - 120, vehicle, upgrade);
        cursorY += 38;
      });
    } else {
      const lockedText = this.add
        .text(width / 2, cursorY + 10, "Unlock this vehicle to buy upgrades.", {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          color: "#77879a",
        })
        .setOrigin(0.5, 0);
      container.add(lockedText);
      cursorY += 40;
    }

    const contentHeight = cursorY;
    const maskShape = this.make.graphics({});
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, top, width, areaHeight);
    this.scrollMaskShape = maskShape;
    container.setMask(maskShape.createGeometryMask());
    maxScrollRef.value = Math.max(0, contentHeight - areaHeight);
    // A small visual hint that there's more to scroll, only shown when it's actually needed.
    if (maxScrollRef.value > 0) {
      this.add
        .text(width - 14, top + areaHeight - 6, "⇕ scroll", {
          fontFamily: "Arial, sans-serif",
          fontSize: "11px",
          color: "#5c728a",
        })
        .setOrigin(1, 1);
    }
  }

  /** Creates an interactive zone covering the scroll area (added to the display list before
   * the scrollable content, so foreground buttons still receive clicks first) and wires up
   * mouse-wheel + drag scrolling for it, clamped to `maxScrollRef.value`. */
  private setupScrollZone(
    width: number,
    top: number,
    areaHeight: number,
    maxScrollRef: { value: number },
  ): Phaser.GameObjects.Zone {
    const zone = this.add.zone(width / 2, top + areaHeight / 2, width, areaHeight).setInteractive();

    zone.on("wheel", (_pointer: Phaser.Input.Pointer, _dx: number, dy: number) => {
      if (!this.scrollContainer) return;
      const nextOffset = Phaser.Math.Clamp(
        this.scrollContainer.y - top - dy * 0.5,
        -maxScrollRef.value,
        0,
      );
      this.scrollContainer.y = top + nextOffset;
    });

    let dragStartY = 0;
    let containerStartY = 0;
    zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      dragStartY = pointer.y;
      containerStartY = this.scrollContainer?.y ?? top;
    });
    zone.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || !this.scrollContainer) return;
      const delta = pointer.y - dragStartY;
      const nextOffset = Phaser.Math.Clamp(containerStartY - top + delta, -maxScrollRef.value, 0);
      this.scrollContainer.y = top + nextOffset;
    });

    return zone;
  }

  private spawnPreview(vehicle: VehicleConfig, centerX: number, groundY: number): void {
    this.previewGroundBody = this.matter.bodies.rectangle(centerX, groundY + 20, 500, 40, {
      isStatic: true,
      friction: 0.9,
    });
    this.matter.world.add(this.previewGroundBody);

    const effective = getEffectiveVehicleConfig(vehicle, this.saveManager);
    this.previewVehicle = createVehicle(this, effective, centerX, groundY - 90);

    this.events.on(Phaser.Scenes.Events.UPDATE, this.renderPreview, this);
  }

  private renderPreview = (): void => {
    this.previewVehicle?.render();
  };

  private destroyPreview(): void {
    this.events.off(Phaser.Scenes.Events.UPDATE, this.renderPreview, this);
    this.previewVehicle?.destroy();
    this.previewVehicle = undefined;
    if (this.previewGroundBody) {
      this.matter.world.remove(this.previewGroundBody);
      this.previewGroundBody = undefined;
    }
  }

  private drawStatBar(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    label: string,
    ratio: number,
  ): void {
    const labelText = this.add
      .text(x, y, label, { fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#cfe8ff" })
      .setOrigin(0, 0.5);
    const barX = x + 100;
    const barWidth = width - 100;
    const track = this.add.rectangle(barX, y, barWidth, 10, 0x1a2530).setOrigin(0, 0.5);
    const fill = this.add.rectangle(barX, y, barWidth * ratio, 10, 0x6fc2ff).setOrigin(0, 0.5);
    container.add([labelText, track, fill]);
  }

  private drawUpgradeRow(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    vehicle: VehicleConfig,
    upgrade: UpgradeDef,
  ): void {
    const level = this.saveManager.getUpgradeLevel(vehicle.id, upgrade.id);
    const maxed = level >= UPGRADE_MAX_LEVEL;

    const nameText = this.add
      .text(x, y, upgrade.name, {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
    container.add(nameText);

    const pipStartX = x + 130;
    const pipSize = 10;
    const pipGap = 4;
    for (let i = 0; i < UPGRADE_MAX_LEVEL; i++) {
      const filled = i < level;
      const pip = this.add
        .rectangle(pipStartX + i * (pipSize + pipGap), y, pipSize, pipSize, filled ? 0xffd94a : 0x2b3a4a)
        .setStrokeStyle(1, 0x1a1a1a);
      container.add(pip);
    }

    const buttonX = x + width - 70;
    if (maxed) {
      const maxText = this.add
        .text(buttonX, y, "MAX", {
          fontFamily: "Arial, sans-serif",
          fontSize: "13px",
          color: "#8fe24a",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      container.add(maxText);
      return;
    }

    const cost = getUpgradeCost(level);
    const affordable = this.economy.canAfford(cost);
    const button = this.add
      .rectangle(buttonX, y, 120, 26, affordable ? 0x4a9a5f : 0x3a4650)
      .setStrokeStyle(2, 0x1a1a1a)
      .setInteractive({ useHandCursor: true });
    const costText = this.add
      .text(buttonX, y, `+1  ${cost}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    container.add([button, costText]);
    button.on("pointerdown", () => {
      if (!this.economy.spendCoins(cost)) return;
      this.saveManager.setUpgradeLevel(vehicle.id, upgrade.id, level + 1);
      this.buildUI();
    });
  }

  private drawCoinBadge(x: number, y: number, coins: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x1a1a1a, 1);
    g.fillCircle(x - 60, y, 12);
    g.fillStyle(0xffd94a, 1);
    g.fillCircle(x - 60, y, 10);
    this.add
      .text(x - 40, y, `${coins}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);
  }

  private createArrowButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add
      .rectangle(x, y, 44, 60, 0x2b3a4a)
      .setStrokeStyle(2, 0x1a1a1a)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, { fontFamily: "Arial, sans-serif", fontSize: "24px", color: "#ffffff" })
      .setOrigin(0.5);
    button.on("pointerdown", onClick);
  }

  private createButton(x: number, y: number, label: string, color: number, onClick: () => void): void {
    const button = this.add.rectangle(x, y, 260, 44, color).setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, {
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    button.on("pointerdown", onClick);
  }

  private createSmallButton(x: number, y: number, label: string, color: number, onClick: () => void): void {
    const button = this.add.rectangle(x, y, 84, 32, color).setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    button.on("pointerdown", onClick);
  }

  shutdown(): void {
    this.destroyPreview();
    this.scrollMaskShape?.destroy();
    this.scrollMaskShape = undefined;
  }
}
