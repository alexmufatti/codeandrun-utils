import type { TrainingZone, RacePrediction } from "@/types/vdot";

// ──────────────────────────────────────────────
// Core formulas (Daniels' Running Formula)
// ──────────────────────────────────────────────

/** VO2 consumed at velocity v (m/min) */
function vo2AtVelocity(v: number): number {
  return -4.60 + 0.182258 * v + 0.000104 * v * v;
}

/** Velocity (m/min) that produces a given VO2 (quadratic inverse) */
function velocityFromVO2(vo2: number): number {
  const a = 0.000104, b = 0.182258, c = -(vo2 + 4.60);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

/** Fraction of VO2max utilised in a race of duration t_min */
function pctVO2max(t_min: number): number {
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * t_min) +
    0.2989558 * Math.exp(-0.1932605 * t_min)
  );
}

/** Pace in sec/km from velocity in m/min */
function paceSecKm(v: number): number {
  return (60 * 1000) / v;
}

// ──────────────────────────────────────────────
// Formatting helpers
// ──────────────────────────────────────────────

/** sec/km → "M:SS" */
export function formatPaceSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** seconds → "H:MM:SS" */
export function formatTotalTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.round(totalSec % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** seconds → "M:SS" or `XX"` for under 60s */
function formatRepTime(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}"`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ──────────────────────────────────────────────
// Main calculations
// ──────────────────────────────────────────────

/**
 * Calculate VDOT from race performance.
 * distanceM: metres, timeMin: minutes
 */
export function calculateVdot(distanceM: number, timeMin: number): number {
  if (distanceM <= 0 || timeMin <= 0) return NaN;
  const v = distanceM / timeMin;
  const vo2 = vo2AtVelocity(v);
  if (vo2 <= 0) return NaN;
  return vo2 / pctVO2max(timeMin);
}

/**
 * Predict race time (seconds) for a given distance at the given VDOT.
 * Uses bisection on t such that calculateVdot(distanceM, t) = vdot.
 */
export function predictRaceTimeSec(distanceM: number, vdot: number): number {
  // lo = very fast (high VDOT), hi = very slow (low VDOT)
  let lo = distanceM / 700; // ~700 m/min max speed
  let hi = distanceM / 55;  // ~55 m/min ≈ 18 min/km

  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const calcVdot = calculateVdot(distanceM, mid);
    if (calcVdot > vdot) {
      lo = mid; // too fast → slow down → increase t
    } else {
      hi = mid; // too slow → speed up → decrease t
    }
  }
  return ((lo + hi) / 2) * 60; // convert minutes → seconds
}

/**
 * Calculate training zones from VDOT.
 *
 * Calibration vs Daniels' published tables (VDOT 50):
 *   E:  59-74% VDOT → ~4:54–5:53 /km  (book: ~5:08–5:57)
 *   M:  bisect(42195m) → ~4:30 /km     (book: ~4:22)
 *   T:  pctVO2max(30min)×VDOT → ~4:05  (book: 4:05 ✓)
 *   I:  100% VDOT → 3:50               (book: 3:50 ✓)
 *   R:  115% VDOT → ~3:20              (book: ~3:25)
 */
export function calculateZones(vdot: number): TrainingZone[] {
  // E — easy/recovery (59–74% VO2max)
  const paceE_fast = paceSecKm(velocityFromVO2(vdot * 0.74));
  const paceE_slow = paceSecKm(velocityFromVO2(vdot * 0.59));

  // M — marathon pace (predict exact marathon time)
  const t_marathon_sec = predictRaceTimeSec(42195, vdot);
  const paceM = (t_marathon_sec / 42.195);

  // T — threshold (equivalent to 30-min race: pctVO2max(30) ≈ 0.930)
  const paceT = paceSecKm(velocityFromVO2(vdot * pctVO2max(30)));

  // I — interval / VO2max (100% VDOT)
  const paceI = paceSecKm(velocityFromVO2(vdot * 1.0));
  const repI = [
    { distance: "400m",  time: formatRepTime(paceI * 0.4) },
    { distance: "1000m", time: formatRepTime(paceI * 1.0) },
    { distance: "1200m", time: formatRepTime(paceI * 1.2) },
    { distance: "1600m", time: formatRepTime(paceI * 1.6) },
  ];

  // R — repetition (115% VDOT, speed/economy)
  const paceR = paceSecKm(velocityFromVO2(vdot * 1.15));
  const repR = [
    { distance: "200m", time: formatRepTime(paceR * 0.2) },
    { distance: "400m", time: formatRepTime(paceR * 0.4) },
    { distance: "600m", time: formatRepTime(paceR * 0.6) },
  ];

  return [
    { id: "E", paceSecPerKm: (paceE_fast + paceE_slow) / 2, paceRangeMinSec: paceE_fast, paceRangeMaxSec: paceE_slow },
    { id: "M", paceSecPerKm: paceM },
    { id: "T", paceSecPerKm: paceT },
    { id: "I", paceSecPerKm: paceI, repTimes: repI },
    { id: "R", paceSecPerKm: paceR, repTimes: repR },
  ];
}

/** Predict times for common race distances */
export function predictRaceTimes(vdot: number): RacePrediction[] {
  return [
    { label: "1500m",    distanceM: 1500 },
    { label: "5K",       distanceM: 5000 },
    { label: "10K",      distanceM: 10000 },
    { label: "Mezza",    distanceM: 21097.5 },
    { label: "Maratona", distanceM: 42195 },
  ].map(({ label, distanceM }) => ({
    label,
    distanceM,
    timeStr: formatTotalTime(predictRaceTimeSec(distanceM, vdot)),
  }));
}
