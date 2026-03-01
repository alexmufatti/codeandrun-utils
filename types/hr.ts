export interface HrZone {
  id: 1 | 2 | 3 | 4 | 5;
  minBpm: number;
  maxBpm: number;
}

export interface ZonePercent {
  min: number;
  max: number;
}

export type HrFormula = "fox" | "tanaka" | "gellish" | "nes";
export type HrSource = "manual" | "formula";

export const DEFAULT_ZONE_PERCENTS: ZonePercent[] = [
  { min: 50, max: 60 },
  { min: 60, max: 70 },
  { min: 70, max: 80 },
  { min: 80, max: 90 },
  { min: 90, max: 100 },
];
