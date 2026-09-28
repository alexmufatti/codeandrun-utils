import type { Segment, SegmentBreakpoint, Split, SplitUnit } from "@/types/pace";

const MI_TO_KM = 1.60934;

/** decimal string accepting comma or dot, NaN if invalid */
export function parseDecimal(str: string): number {
  return Number(str.trim().replace(",", "."));
}

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

/** "HH:MM" → minutes from midnight, returns NaN if invalid */
export function parseStartTime(str: string): number {
  const parts = str.trim().split(":");
  if (parts.length !== 2) return NaN;
  const [h, m] = parts.map(Number);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m >= 60) return NaN;
  return h * 60 + m;
}

/** startMinutes + distance + pace → "HH:MM" wall-clock time */
export function calculatePassageTime(
  startMinutes: number,
  distKm: number,
  paceSecPerKm: number
): string {
  if (!isFinite(startMinutes) || !isFinite(distKm) || !isFinite(paceSecPerKm)) return "—";
  const elapsedMin = (distKm * paceSecPerKm) / 60;
  const totalMin = Math.round(startMinutes + elapsedMin) % (24 * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Resolve "Resto" segment's distanceKm from total race distance minus other segments */
export function resolveEffectiveSegments(
  segments: Segment[],
  totalRaceKm: string
): Segment[] {
  const totalKm = parseDecimal(totalRaceKm);
  const otherDistKm = segments
    .filter((s) => !s.isRest)
    .reduce((sum, s) => {
      const d = parseDecimal(s.distanceKm);
      return sum + (isFinite(d) && d > 0 ? d : 0);
    }, 0);
  const restDistKm = isFinite(totalKm) && totalKm > 0 ? totalKm - otherDistKm : NaN;

  return segments.map((s) =>
    s.isRest
      ? { ...s, distanceKm: isFinite(restDistKm) && restDistKm > 0 ? String(restDistKm) : "" }
      : s
  );
}

/**
 * Build cumulative distance/time breakpoints from an ordered segment list.
 * Stops at the first invalid/empty segment — checkpoints beyond that point
 * can't be resolved from the plan.
 */
export function buildSegmentBreakpoints(segments: Segment[]): SegmentBreakpoint[] {
  const breakpoints: SegmentBreakpoint[] = [];
  let cumKm = 0;
  let cumSec = 0;

  for (const seg of segments) {
    const distKm = parseDecimal(seg.distanceKm);
    const paceSec = parsePace(seg.paceInput);
    if (!isFinite(distKm) || distKm <= 0 || !isFinite(paceSec) || paceSec <= 0) break;

    breakpoints.push({ startKm: cumKm, endKm: cumKm + distKm, startSec: cumSec, paceSec });
    cumKm += distKm;
    cumSec += distKm * paceSec;
  }

  return breakpoints;
}

/**
 * Elapsed race time (seconds) at a given distance, per the segment plan.
 * paceOffsetSec shifts every segment's pace (e.g. for a tolerance band).
 * Returns NaN if the distance falls outside the resolved plan.
 */
export function getElapsedSecFromSegments(
  distKm: number,
  breakpoints: SegmentBreakpoint[],
  paceOffsetSec = 0
): number {
  if (!isFinite(distKm) || distKm < 0) return NaN;

  const bp = breakpoints.find((b) => distKm >= b.startKm && distKm <= b.endKm);
  if (!bp) return NaN;

  const baseSec = bp.startSec + (distKm - bp.startKm) * bp.paceSec;
  return Math.max(0, baseSec + paceOffsetSec * distKm);
}

/**
 * startMinutes + distance + segment plan → "HH:MM" wall-clock time.
 * paceOffsetSec shifts every segment's pace (e.g. for a tolerance band).
 * Returns "—" if the distance falls outside the resolved plan.
 */
export function calculatePassageTimeFromSegments(
  startMinutes: number,
  distKm: number,
  breakpoints: SegmentBreakpoint[],
  paceOffsetSec = 0
): string {
  if (!isFinite(startMinutes)) return "—";

  const elapsedSec = getElapsedSecFromSegments(distKm, breakpoints, paceOffsetSec);
  if (!isFinite(elapsedSec)) return "—";

  const totalMin = Math.round(startMinutes + elapsedSec / 60) % (24 * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Aggregate segment list → totals + average pace */
export function calculateSegments(
  segments: { distanceKm: string; paceInput: string }[]
): { totalTimeSec: number; totalDistKm: number; avgPaceSec: number } | null {
  let totalTimeSec = 0;
  let totalDistKm = 0;

  for (const seg of segments) {
    const dist = parseDecimal(seg.distanceKm);
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
