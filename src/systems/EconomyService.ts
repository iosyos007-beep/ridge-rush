import { SaveManager } from "./SaveManager.ts";

/**
 * Thin façade over coin income/spending. Kept as its own interface (rather than having
 * scenes talk to `SaveManager` directly for money) so the "no ads, no IAP, coins are earned
 * only through gameplay" monetization rule stays enforced in exactly one place, and so a
 * different backing implementation (e.g. a future server-synced wallet) could be swapped in
 * without touching gameplay code.
 */
export interface EconomyService {
  getCoins(): number;
  addCoins(amount: number): void;
  spendCoins(amount: number): boolean;
  canAfford(amount: number): boolean;
}

/** Default implementation: coins live in the same `SaveManager`-backed localStorage save
 * as the rest of progress. */
export class SaveManagerEconomyService implements EconomyService {
  constructor(private readonly saveManager: SaveManager) {}

  getCoins(): number {
    return this.saveManager.getData().coins;
  }

  addCoins(amount: number): void {
    this.saveManager.addCoins(amount);
  }

  spendCoins(amount: number): boolean {
    return this.saveManager.spendCoins(amount);
  }

  canAfford(amount: number): boolean {
    return this.getCoins() >= amount;
  }
}
