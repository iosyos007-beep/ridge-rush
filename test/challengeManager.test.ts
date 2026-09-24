import { describe, it, expect, beforeEach } from "vitest";
import {
  applyRunToChallenges,
  computeNextProgress,
  getOrCreateDailyChallenges,
  type RunContribution,
} from "../src/systems/ChallengeManager.ts";
import type { DailyChallenge } from "../src/config/dailyChallenges.ts";
import { SaveManager, type KeyValueStorage } from "../src/systems/SaveManager.ts";

class MemoryStorage implements KeyValueStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

function baseRun(overrides: Partial<RunContribution> = {}): RunContribution {
  return {
    stageId: "green-hills",
    vehicleId: "starter-jeep",
    distanceMeters: 0,
    coinsCollected: 0,
    flips: 0,
    wheelies: 0,
    ...overrides,
  };
}

describe("computeNextProgress", () => {
  const distanceChallenge: DailyChallenge = {
    id: "test:distance-in-stage",
    description: "test",
    metric: "distanceInStage",
    aggregate: "max",
    target: 500,
    coinReward: 100,
    stageId: "green-hills",
  };
  const coinsChallenge: DailyChallenge = {
    id: "test:coins-today",
    description: "test",
    metric: "coinsToday",
    aggregate: "sum",
    target: 1000,
    coinReward: 200,
  };

  it("'max' aggregate keeps the best single-run value, not a running total", () => {
    const afterFirstRun = computeNextProgress(distanceChallenge, baseRun({ distanceMeters: 300 }), 0);
    expect(afterFirstRun).toBe(300);
    const afterSecondRun = computeNextProgress(
      distanceChallenge,
      baseRun({ distanceMeters: 200 }),
      afterFirstRun,
    );
    // A worse second run should not lower progress already made.
    expect(afterSecondRun).toBe(300);
  });

  it("'max' aggregate ignores contributions from a different stage", () => {
    const next = computeNextProgress(
      distanceChallenge,
      baseRun({ stageId: "desert-dunes", distanceMeters: 900 }),
      0,
    );
    expect(next).toBe(0);
  });

  it("'sum' aggregate accumulates across multiple runs", () => {
    const afterFirstRun = computeNextProgress(coinsChallenge, baseRun({ coinsCollected: 400 }), 0);
    const afterSecondRun = computeNextProgress(coinsChallenge, baseRun({ coinsCollected: 300 }), afterFirstRun);
    expect(afterSecondRun).toBe(700);
  });
});

describe("applyRunToChallenges", () => {
  let saveManager: SaveManager;

  beforeEach(() => {
    saveManager = new SaveManager(new MemoryStorage());
  });

  it("marks a challenge completed and pays its reward exactly once when its target is reached", () => {
    const challenges = getOrCreateDailyChallenges(saveManager);
    const target = challenges[0]!;

    // Build a run guaranteed to satisfy this specific challenge, whatever metric it has.
    const run = baseRun({
      stageId: target.stageId ?? "green-hills",
      vehicleId: target.vehicleId ?? "starter-jeep",
      distanceMeters: target.target + 100,
      coinsCollected: target.target + 100,
      flips: target.target + 100,
      wheelies: target.target + 100,
    });

    const firstResult = applyRunToChallenges(saveManager, run).find((r) => r.challenge.id === target.id);
    expect(firstResult?.justCompleted).toBe(true);
    const coinsAfterFirst = saveManager.getData().coins;
    expect(coinsAfterFirst).toBeGreaterThanOrEqual(target.coinReward);

    // A second run shouldn't re-complete (or re-pay) an already-completed challenge.
    const secondResult = applyRunToChallenges(saveManager, run).find((r) => r.challenge.id === target.id);
    expect(secondResult).toBeUndefined();
    expect(saveManager.getData().coins).toBe(coinsAfterFirst);
  });

  it("does not complete a challenge from an unrelated, insufficient run", () => {
    const challenges = getOrCreateDailyChallenges(saveManager);
    const results = applyRunToChallenges(saveManager, baseRun());
    for (const result of results) {
      // An all-zero run contributes nothing, so nothing should complete immediately
      // unless a challenge's target is itself 0 (not expected given generator ranges).
      expect(result.justCompleted).toBe(false);
    }
    expect(challenges).toHaveLength(3);
  });
});
