import { describe, it, expect } from "vitest";
import { engineFrequency, clampVolume, effectiveVolume } from "../src/systems/AudioMath.ts";

describe("engineFrequency", () => {
  it("returns the idle frequency at ratio 0 and the max frequency at ratio 1", () => {
    expect(engineFrequency(0, 55, 240)).toBe(55);
    expect(engineFrequency(1, 55, 240)).toBe(240);
  });

  it("interpolates linearly between idle and max", () => {
    expect(engineFrequency(0.5, 100, 300)).toBe(200);
  });

  it("clamps ratios outside 0..1", () => {
    expect(engineFrequency(-2, 55, 240)).toBe(55);
    expect(engineFrequency(5, 55, 240)).toBe(240);
  });
});

describe("clampVolume", () => {
  it("clamps into the 0..1 range", () => {
    expect(clampVolume(-0.5)).toBe(0);
    expect(clampVolume(1.5)).toBe(1);
    expect(clampVolume(0.42)).toBe(0.42);
  });
});

describe("effectiveVolume", () => {
  it("returns 0 when muted regardless of the slider value", () => {
    expect(effectiveVolume(0.9, true)).toBe(0);
  });

  it("returns the clamped slider value when not muted", () => {
    expect(effectiveVolume(0.9, false)).toBe(0.9);
    expect(effectiveVolume(1.5, false)).toBe(1);
  });
});
