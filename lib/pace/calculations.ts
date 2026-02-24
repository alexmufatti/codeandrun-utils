import type { Split, SplitUnit } from "@/types/pace";

const MI_TO_KM = 1.60934;

/** "MM:SS" → seconds/km, returns NaN if invalid */
export function parsePace(str: string): number {
  const parts = str.trim().split(":");
  if (parts.length !== 2) return NaN;
  const [m, s] = parts.map(Number);
  if (isNaN(m) || isNaN(s) || s < 0 || s >= 60) return NaN;
  return m * 60 + s;
}

/** seconds/km → "M:SS" */
export function formatPace(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** total seconds → "H:MM:SS" */
export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "--:--:--";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** "H:MM:SS" or "MM:SS" → total seconds, returns NaN if invalid */
export function parseTime(str: string): number {
  const parts = str.trim().split(":").map(Number);
  if (parts.some(isNaN)) return NaN;
  if (parts.length === 3) {
    const [h, m, s] = parts;
    if (m >= 60 || s >= 60) return NaN;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    if (s >= 60) return NaN;
    return m * 60 + s;
  }
  return NaN;
}

/** seconds/km from distance and total time */
export function calculatePace(distKm: number, totalSec: number): number {
  if (distKm <= 0 || totalSec <= 0) return NaN;
  return totalSec / distKm;
}

/** total seconds from distance and pace */
export function calculateTime(distKm: number, paceSec: number): number {
  if (distKm <= 0 || paceSec <= 0) return NaN;
  return distKm * paceSec;
}

/** distance in km from total time and pace */
export function calculateDistance(totalSec: number, paceSec: number): number {
  if (totalSec <= 0 || paceSec <= 0) return NaN;
  return totalSec / paceSec;
}

/**
 * Generate per-split table. Full splits + optional partial final split.
 * unit: "km" → 1 km splits, "mi" → 1 mile splits (≈1.60934 km each)
 */
export function generateSplits(
  distKm: number,
  paceSec: number,
  unit: SplitUnit
): Split[] {
  if (!isFinite(distKm) || distKm <= 0 || !isFinite(paceSec) || paceSec <= 0) {
    return [];
  }

  const splitDistKm = unit === "mi" ? MI_TO_KM : 1;
  const splitTimeSec = paceSec * splitDistKm;

  const fullSplits = Math.floor(distKm / splitDistKm);
  const remainder = distKm - fullSplits * splitDistKm;

  const splits: Split[] = [];

  for (let i = 1; i <= fullSplits; i++) {
    const cumSec = i * splitTimeSec;
    splits.push({
      label: unit === "mi" ? `${i} mi` : `${i} km`,
      splitTime: formatTime(splitTimeSec),
      cumulative: formatTime(cumSec),
      distance: i * splitDistKm,
    });
  }

  if (remainder > 0.001) {
    const partialSec = paceSec * remainder;
    const cumSec = fullSplits * splitTimeSec + partialSec;
    const label =
      unit === "mi"
        ? `${(fullSplits * splitDistKm + remainder).toFixed(3)} mi`
        : `${distKm.toFixed(3)} km`;
    splits.push({
      label,
      splitTime: formatTime(partialSec),
      cumulative: formatTime(cumSec),
      distance: distKm,
      isPartial: true,
    });
  }

  return splits;
}

/** Aggregate segment list → totals + average pace */
export function calculateSegments(
  segments: { distanceKm: string; paceInput: string }[]
): { totalTimeSec: number; totalDistKm: number; avgPaceSec: number } | null {
  let totalTimeSec = 0;
  let totalDistKm = 0;

  for (const seg of segments) {
    const dist = parseFloat(seg.distanceKm);
    const pace = parsePace(seg.paceInput);
    if (!isFinite(dist) || dist <= 0 || !isFinite(pace) || pace <= 0) {
      return null;
    }
    totalDistKm += dist;
    totalTimeSec += dist * pace;
  }

  if (totalDistKm === 0) return null;

  return {
    totalTimeSec,
    totalDistKm,
    avgPaceSec: totalTimeSec / totalDistKm,
  };
}
