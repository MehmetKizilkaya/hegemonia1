/** War damage: level + energy + weapon bonus */
export function calculateWarDamage(level: number, energySpent: number, weaponBonus = 0): number {
  const base = Math.floor(Math.pow(level, 0.8) * 10);
  return Math.floor(base * energySpent * (1 + weaponBonus / 100));
}

/** Production speed multiplier from workers */
export function workerSpeedMultiplier(activeWorkers: number, maxWorkers: number): number {
  if (maxWorkers === 0) return 0;
  return Math.min(1, activeWorkers / maxWorkers);
}

/** Region bonus applied to production */
export function applyRegionBonus(baseOutput: number, sector: string, bonuses: { sector: string; multiplier: number }[]): number {
  const bonus = bonuses.find((b) => b.sector === sector);
  return Math.floor(baseOutput * (bonus?.multiplier ?? 1));
}

/** Simple supply-demand price adjustment */
export function adjustPrice(basePrice: number, supply: number, demand: number): number {
  if (supply === 0) return basePrice * 2;
  const ratio = demand / supply;
  const factor = Math.max(0.5, Math.min(2.0, ratio));
  return Math.floor(basePrice * factor);
}

/** XP required for next level */
export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}
