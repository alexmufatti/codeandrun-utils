import type { HrZone, HrFormula, ZonePercent } from "@/types/hr";

export function calcMaxHr(age: number, formula: HrFormula): number {
  switch (formula) {
    case "fox":     return Math.round(220 - age);
    case "tanaka":  return Math.round(208 - 0.7 * age);
    case "gellish": return Math.round(207 - 0.7 * age);
    case "nes":     return Math.round(211 - 0.64 * age);
  }
}

export function calculateZonesMhr(maxHr: number, percents: ZonePercent[]): HrZone[] {
  return percents.map(({ min, max }, i) => ({
    id: (i + 1) as HrZone["id"],
    minBpm: Math.round(maxHr * min / 100),
    maxBpm: Math.round(maxHr * max / 100),
  }));
}

export function calculateZonesKarvonen(maxHr: number, restingHr: number, percents: ZonePercent[]): HrZone[] {
  const hrr = maxHr - restingHr;
  return percents.map(({ min, max }, i) => ({
    id: (i + 1) as HrZone["id"],
    minBpm: Math.round(restingHr + hrr * min / 100),
    maxBpm: Math.round(restingHr + hrr * max / 100),
  }));
}
