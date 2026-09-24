import { describe, expect, it } from "vitest";
import { wrapAngleDelta, countFlips, countAirTimeUnits } from "../src/systems/TrickMath.ts";

describe("wrapAngleDelta", () => {
  it("passes small deltas through unchanged", () => {
    expect(wrapAngleDelta(0.1)).toBeCloseTo(0.1);
    expect(wrapAngleDelta(-0.1)).toBeCloseTo(-0.1);
  });

  it("wraps a delta that crosses the +PI boundary to a small negative delta", () => {
    // e.g. angle goes from 3.1 to -3.1 (crossing PI): raw delta is -6.2, which should wrap to
    // a small positive delta (~0.083), matching continued forward rotation, not a huge jump.
    const raw = -3.1 - 3.1;
    expect(wrapAngleDelta(raw)).toBeCloseTo(Math.PI * 2 - 6.2, 5);
  });

  it("wraps a delta that crosses the -PI boundary to a small positive delta", () => {
    const raw = 3.1 - -3.1;
    expect(wrapAngleDelta(raw)).toBeCloseTo(6.2 - Math.PI * 2, 5);
  });
});

describe("countFlips", () => {
  it("counts zero flips for less than one full rotation", () => {
    expect(countFlips(Math.PI).count).toBe(0);
    expect(countFlips(-Math.PI).count).toBe(0);
  });

  it("counts exactly one flip at just over 2*PI", () => {
    const result = countFlips(Math.PI * 2 + 0.01);
    expect(result.count).toBe(1);
    expect(result.direction).toBe("forward");
  });

  it("counts backward flips for negative accumulated rotation", () => {
    const result = countFlips(-(Math.PI * 2 + 0.01));
    expect(result.count).toBe(1);
    expect(result.direction).toBe("backward");
  });

  it("counts multiple full rotations", () => {
    expect(countFlips(Math.PI * 2 * 2.5).count).toBe(2);
    expect(countFlips(Math.PI * 2 * 3.99).count).toBe(3);
  });

  it("treats exactly zero rotation as zero flips in the forward direction", () => {
    const result = countFlips(0);
    expect(result.count).toBe(0);
    expect(result.direction).toBe("forward");
  });
});

describe("countAirTimeUnits", () => {
  it("returns 0 below the minimum air time", () => {
    expect(countAirTimeUnits(0.4, 0.6, 0.5)).toBe(0);
  });

  it("returns the number of unit increments once above the minimum", () => {
    expect(countAirTimeUnits(0.6, 0.6, 0.5)).toBe(1);
    expect(countAirTimeUnits(1.0, 0.6, 0.5)).toBe(2);
    expect(countAirTimeUnits(1.49, 0.6, 0.5)).toBe(2);
    expect(countAirTimeUnits(1.5, 0.6, 0.5)).toBe(3);
  });
});
