/**
 * Data-driven daily challenge templates. Three challenges are generated deterministically
 * from a date seed (`YYYY-MM-DD`) each day — same seed always produces the same 3
 * challenges, so this is fully unit-testable without touching the clock or localStorage.
 */
import { mulberry32, hashSeedString } from "../systems/TerrainHeightField.ts";
import { VEHICLES } from "./vehicles.ts";
import { STAGES } from "./stages.ts";

export type ChallengeMetric =
  | "distanceInStage"
  | "distanceWithVehicle"
  | "flipsInRun"
  | "wheeliesInRun"
  | "coinsToday";

/** How a run's contribution combines with prior progress for this challenge: `max` keeps
 * the best single-run value seen so far, `sum` accumulates across every run today. */
export type ChallengeAggregate = "max" | "sum";

export interface DailyChallenge {
  /** Stable within the day (`${dateKey}:${templateId}`), used as the progress/completion key. */
  id: string;
  description: string;
  metric: ChallengeMetric;
  aggregate: ChallengeAggregate;
  target: number;
  coinReward: number;
  vehicleId?: string;
  stageId?: string;
}

interface ChallengeTemplate {
  templateId: string;
  metric: ChallengeMetric;
  aggregate: ChallengeAggregate;
  build: (rng: () => number) => Omit<DailyChallenge, "id" | "metric" | "aggregate">;
}

/** Rounds `value` to the nearest `step`, keeping generated targets "round" numbers. */
function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

const TEMPLATES: ChallengeTemplate[] = [
  {
    templateId: "distance-in-stage",
    metric: "distanceInStage",
    aggregate: "max",
    build: (rng) => {
      const stage = STAGES[Math.floor(rng() * STAGES.length)]!;
      const target = roundToStep(400 + rng() * 500, 50);
      return {
        description: `Drive ${target} m in ${stage.name}`,
        target,
        coinReward: Math.round(target / 3),
        stageId: stage.id,
      };
    },
  },
  {
    templateId: "distance-with-vehicle",
    metric: "distanceWithVehicle",
    aggregate: "max",
    build: (rng) => {
      const vehicle = VEHICLES[Math.floor(rng() * VEHICLES.length)]!;
      const target = roundToStep(300 + rng() * 500, 50);
      return {
        description: `Drive ${target} m with the ${vehicle.name}`,
        target,
        coinReward: Math.round(target / 3),
        vehicleId: vehicle.id,
      };
    },
  },
  {
    templateId: "flips-in-run",
    metric: "flipsInRun",
    aggregate: "max",
    build: (rng) => {
      const target = 3 + Math.floor(rng() * 4); // 3..6
      return {
        description: `Land ${target} flips in one run`,
        target,
        coinReward: target * 60,
      };
    },
  },
  {
    templateId: "wheelies-in-run",
    metric: "wheeliesInRun",
    aggregate: "max",
    build: (rng) => {
      const target = 2 + Math.floor(rng() * 4); // 2..5
      return {
        description: `Pull ${target} wheelies in one run`,
        target,
        coinReward: target * 60,
      };
    },
  },
  {
    templateId: "coins-today",
    metric: "coinsToday",
    aggregate: "sum",
    build: (rng) => {
      const target = roundToStep(500 + rng() * 1500, 100);
      return {
        description: `Collect ${target} coins today`,
        target,
        coinReward: Math.round(target / 4),
      };
    },
  },
];

/** Deterministically shuffles a copy of `items` using `rng` (Fisher-Yates). */
function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** Generates today's 3 daily challenges from a `YYYY-MM-DD` date key. Deterministic: the
 * same `dateKey` always yields the same 3 challenges (same templates, targets, rewards). */
export function generateDailyChallenges(dateKey: string): DailyChallenge[] {
  const rng = mulberry32(hashSeedString(dateKey));
  const chosen = shuffle(TEMPLATES, rng).slice(0, 3);

  return chosen.map((template) => {
    const built = template.build(rng);
    return {
      id: `${dateKey}:${template.templateId}`,
      metric: template.metric,
      aggregate: template.aggregate,
      ...built,
    };
  });
}
