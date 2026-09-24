import { describe, it, expect } from "vitest";
import { generateDailyChallenges } from "../src/config/dailyChallenges.ts";

describe("generateDailyChallenges", () => {
  it("is deterministic: the same date key always yields the same 3 challenges", () => {
    const a = generateDailyChallenges("2026-01-15");
    const b = generateDailyChallenges("2026-01-15");
    expect(b).toEqual(a);
  });

  it("produces exactly 3 challenges with distinct templates and stable ids", () => {
    const challenges = generateDailyChallenges("2026-03-04");
    expect(challenges).toHaveLength(3);

    const templateIds = challenges.map((c) => c.id.split(":")[1]);
    expect(new Set(templateIds).size).toBe(3);

    for (const challenge of challenges) {
      expect(challenge.id.startsWith("2026-03-04:")).toBe(true);
      expect(challenge.target).toBeGreaterThan(0);
      expect(challenge.coinReward).toBeGreaterThan(0);
    }
  });

  it("different date keys generally yield different challenge sets", () => {
    const day1 = generateDailyChallenges("2026-01-01");
    const day2 = generateDailyChallenges("2026-06-15");
    expect(day1).not.toEqual(day2);
  });
});
