import { describe, it, expect } from "vitest";
import { TerrainHeightField, hashSeedString } from "../src/systems/TerrainHeightField.ts";
import { GREEN_HILLS } from "../src/config/stages.ts";

describe("TerrainHeightField", () => {
  it("produces identical terrain for the same seed", () => {
    const a = new TerrainHeightField(GREEN_HILLS);
    const b = new TerrainHeightField(GREEN_HILLS);

    const samplesA: number[] = [];
    const samplesB: number[] = [];
    for (let x = 0; x <= 4000; x += 8) {
      samplesA.push(a.heightAt(x));
      samplesB.push(b.heightAt(x));
    }

    expect(samplesA).toEqual(samplesB);
  });

  it("produces different terrain for different seeds", () => {
    const stageA = { ...GREEN_HILLS, seed: "seed-one" };
    const stageB = { ...GREEN_HILLS, seed: "seed-two" };
    const a = new TerrainHeightField(stageA);
    const b = new TerrainHeightField(stageB);

    let differs = false;
    for (let x = 0; x <= 2000; x += 8) {
      if (a.heightAt(x) !== b.heightAt(x)) {
        differs = true;
        break;
      }
    }
    expect(differs).toBe(true);
  });

  it("never exceeds the configured max slope between adjacent samples", () => {
    const field = new TerrainHeightField(GREEN_HILLS);
    const step = 8;
    const maxRise = Math.tan(GREEN_HILLS.maxSlopeRadians) * step + 1e-6;

    let previous = field.heightAt(0);
    for (let x = step; x <= 8000; x += step) {
      const current = field.heightAt(x);
      expect(Math.abs(current - previous)).toBeLessThanOrEqual(maxRise);
      previous = current;
    }
  });

  it("hashSeedString is deterministic for the same input", () => {
    expect(hashSeedString("green-hills")).toBe(hashSeedString("green-hills"));
    expect(hashSeedString("green-hills")).not.toBe(hashSeedString("desert-dunes"));
  });
});
