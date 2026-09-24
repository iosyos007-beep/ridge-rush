import { generateDailyChallenges, type DailyChallenge } from "../config/dailyChallenges.ts";
import type { SaveManager } from "./SaveManager.ts";

/** Local (not UTC) `YYYY-MM-DD` date key, so a player's "day" lines up with their own clock. */
export function getTodayDateKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** A single run's contribution to today's challenges. All fields are this run's own totals
 * (not deltas against a prior run). */
export interface RunContribution {
  stageId: string;
  vehicleId: string;
  distanceMeters: number;
  coinsCollected: number;
  flips: number;
  wheelies: number;
}

export interface ChallengeCompletion {
  challenge: DailyChallenge;
  justCompleted: boolean;
}

/** Returns today's 3 challenges, regenerating (and resetting progress) if the save's stored
 * challenges are from a previous day. Safe to call every time a scene needs the challenge
 * list — it's a no-op once today's challenges already exist. */
export function getOrCreateDailyChallenges(saveManager: SaveManager): DailyChallenge[] {
  const todayKey = getTodayDateKey();
  const state = saveManager.getDailyChallengeState();

  if (state.dateKey !== todayKey) {
    saveManager.setDailyChallengeState({ dateKey: todayKey, progressById: {}, completedIds: [] });
  }

  return generateDailyChallenges(todayKey);
}

/** How much a single run contributes toward a given challenge's metric (0 if the run's
 * stage/vehicle doesn't match a challenge that requires one). Exported for direct testing. */
export function contributionAmount(challenge: DailyChallenge, run: RunContribution): number {
  switch (challenge.metric) {
    case "distanceInStage":
      return run.stageId === challenge.stageId ? run.distanceMeters : 0;
    case "distanceWithVehicle":
      return run.vehicleId === challenge.vehicleId ? run.distanceMeters : 0;
    case "flipsInRun":
      return run.flips;
    case "wheeliesInRun":
      return run.wheelies;
    case "coinsToday":
      return run.coinsCollected;
  }
}

/** Combines a run's contribution with prior progress per the challenge's aggregate rule:
 * `max` keeps the best single-run value, `sum` accumulates across every run today. Exported
 * for direct testing. */
export function computeNextProgress(
  challenge: DailyChallenge,
  run: RunContribution,
  previousProgress: number,
): number {
  const amount = contributionAmount(challenge, run);
  return challenge.aggregate === "sum" ? previousProgress + amount : Math.max(previousProgress, amount);
}

/** Applies a completed run's contribution to every one of today's not-yet-completed
 * challenges, paying out coin rewards and marking any newly-completed ones. Ensures today's
 * challenges exist first, so callers don't need to call `getOrCreateDailyChallenges` first. */
export function applyRunToChallenges(
  saveManager: SaveManager,
  run: RunContribution,
): ChallengeCompletion[] {
  const challenges = getOrCreateDailyChallenges(saveManager);
  const state = saveManager.getDailyChallengeState();
  const progressById = { ...state.progressById };
  const completedIds = [...state.completedIds];
  const results: ChallengeCompletion[] = [];

  for (const challenge of challenges) {
    const alreadyCompleted = completedIds.includes(challenge.id);
    const previous = progressById[challenge.id] ?? 0;
    const next = computeNextProgress(challenge, run, previous);
    progressById[challenge.id] = next;

    const justCompleted = !alreadyCompleted && next >= challenge.target;
    if (justCompleted) {
      completedIds.push(challenge.id);
      saveManager.addCoins(challenge.coinReward);
    }
    if (!alreadyCompleted) {
      results.push({ challenge, justCompleted });
    }
  }

  saveManager.setDailyChallengeState({ dateKey: state.dateKey, progressById, completedIds });
  return results;
}
