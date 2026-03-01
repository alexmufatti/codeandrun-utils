import type { HrZone } from "@/types/hr";

const ZONE_RANGES: Array<[number, number]> = [
  [0.50, 0.60],
  [0.60, 0.70],
  [0.70, 0.80],
  [0.80, 0.90],
  [0.90, 1.00],
];

export function calculateZonesMhr(maxHr: number): HrZone[] {
  return ZONE_RANGES.map(([lo, hi], i) => ({
    id: (i + 1) as HrZone["id"],
    minBpm: Math.round(maxHr * lo),
    maxBpm: Math.round(maxHr * hi),
  }));
}

export function calculateZonesKarvonen(maxHr: number, restingHr: number): HrZone[] {
  const hrr = maxHr - restingHr;
  return ZONE_RANGES.map(([lo, hi], i) => ({
    id: (i + 1) as HrZone["id"],
    minBpm: Math.round(restingHr + hrr * lo),
    maxBpm: Math.round(restingHr + hrr * hi),
  }));
}
