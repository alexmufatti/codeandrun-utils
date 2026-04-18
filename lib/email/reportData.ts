import connectDB from "@/lib/mongodb";
import WeightEntry from "@/models/WeightEntry";
import HrvEntry from "@/models/HrvEntry";
import RestHrEntry from "@/models/RestHrEntry";
import StravaActivity from "@/models/StravaActivity";
import UserSettings from "@/models/UserSettings";
import SleepEntry from "@/models/SleepEntry";

export interface WeightReportData {
  current: number | null;
  delta7d: number | null; // difference vs 7 days ago
  avg7d: number | null;
  targetKg: number | null;
  deltaFromTarget: number | null;
  entries: { date: string; weightKg: number }[];
}

export interface HrvReportData {
  avg7d: number | null;
  latest: number | null;
  latestDate: string | null;
  latestStatus: string | null;
  entries: { date: string; lastNightAvg: number | null; status: string | null }[];
}

export interface RestHrReportData {
  avg7d: number | null;
  min7d: number | null;
  max7d: number | null;
  entries: { date: string; restingHR: number }[];
}

export interface StravaActivityData {
  id: number;
  name: string;
  date: string;
  type: string;
  distanceM: number;
  movingTimeSec: number;
  totalElevationGain: number;
  averageHeartrate: number | null;
}

export interface SleepReportData {
  avgDurationSec: number | null;
  avgScore: number | null;
  avgDeepPct: number | null;
  avgRemPct: number | null;
  entries: {
    date: string;
    durationSec: number | null;
    score: number | null;
    deepSec: number | null;
    remSec: number | null;
    lightSec: number | null;
    awakenings: number | null;
    perceivedQuality: number | null;
  }[];
}

export interface ReportData {
  weight: WeightReportData;
  hrv: HrvReportData;
  restHr: RestHrReportData;
  sleep: SleepReportData;
  activities: StravaActivityData[];
  periodDays: number;
  generatedAt: Date;
}

function sevenDaysAgo(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 7);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function gatherReportData(userId: string): Promise<ReportData> {
  await connectDB();

  const since = sevenDaysAgo();
  const sinceStr = toDateStr(since);

  const [weightEntries, settings, hrvEntries, restHrEntries, stravaActivities, sleepEntries] =
    await Promise.all([
      WeightEntry.find({ userId, date: { $gte: since } })
        .sort({ date: 1 })
        .lean(),
      UserSettings.findOne({ userId }).lean(),
      HrvEntry.find({ userId, calendarDate: { $gte: sinceStr } })
        .sort({ calendarDate: 1 })
        .lean(),
      RestHrEntry.find({ userId, calendarDate: { $gte: sinceStr } })
        .sort({ calendarDate: 1 })
        .lean(),
      StravaActivity.find({
        userId,
        start_date: { $gte: since.toISOString() },
        type: { $in: ["Run", "TrailRun", "VirtualRun"] },
      })
        .sort({ start_date: -1 })
        .lean(),
      SleepEntry.find({ userId, calendarDate: { $gte: sinceStr } })
        .sort({ calendarDate: 1 })
        .lean(),
    ]);

  // ── Weight ────────────────────────────────────────────────────────────────
  const wEntries = weightEntries.map((e) => ({
    date: (e.date as Date).toISOString().split("T")[0],
    weightKg: e.weightKg as number,
  }));

  const current = wEntries.length > 0 ? wEntries[wEntries.length - 1].weightKg : null;
  const first = wEntries.length > 0 ? wEntries[0].weightKg : null;
  const delta7d =
    current !== null && first !== null
      ? parseFloat((current - first).toFixed(1))
      : null;
  const avg7d =
    wEntries.length > 0
      ? parseFloat(
          (wEntries.reduce((s, e) => s + e.weightKg, 0) / wEntries.length).toFixed(1)
        )
      : null;
  const targetKg = settings?.targetWeightKg ?? null;
  const deltaFromTarget =
    current !== null && targetKg !== null
      ? parseFloat((current - targetKg).toFixed(1))
      : null;

  // ── HRV ──────────────────────────────────────────────────────────────────
  const hEntries = hrvEntries.map((e) => ({
    date: e.calendarDate as string,
    lastNightAvg: (e.lastNightAvg as number) ?? null,
    status: (e.status as string) ?? null,
  }));

  const hValues = hEntries
    .map((e) => e.lastNightAvg)
    .filter((v): v is number => v !== null);
  const hrvAvg7d =
    hValues.length > 0
      ? parseFloat((hValues.reduce((a, b) => a + b, 0) / hValues.length).toFixed(1))
      : null;
  const latestHrv = hEntries.length > 0 ? hEntries[hEntries.length - 1] : null;

  // ── Rest HR ───────────────────────────────────────────────────────────────
  const rEntries = restHrEntries
    .filter((e) => e.values?.restingHR)
    .map((e) => ({
      date: e.calendarDate as string,
      restingHR: e.values.restingHR as number,
    }));

  const rValues = rEntries.map((e) => e.restingHR);
  const restAvg7d =
    rValues.length > 0
      ? parseFloat((rValues.reduce((a, b) => a + b, 0) / rValues.length).toFixed(1))
      : null;
  const restMin7d = rValues.length > 0 ? Math.min(...rValues) : null;
  const restMax7d = rValues.length > 0 ? Math.max(...rValues) : null;

  // ── Sleep ─────────────────────────────────────────────────────────────────
  const sEntries = sleepEntries.map((e) => ({
    date: e.calendarDate as string,
    durationSec: (e.sleepTimeSeconds as number) ?? null,
    score: (e.sleepScore as number) ?? null,
    deepSec: (e.deepSleepSeconds as number) ?? null,
    remSec: (e.remSleepSeconds as number) ?? null,
    lightSec: (e.lightSleepSeconds as number) ?? null,
    awakenings: (e.awakenings as number) ?? null,
    perceivedQuality: (e.perceivedQuality as number) ?? null,
  }));

  const sWithDuration = sEntries.filter((e) => e.durationSec !== null);
  const avgDurationSec =
    sWithDuration.length > 0
      ? Math.round(sWithDuration.reduce((a, e) => a + e.durationSec!, 0) / sWithDuration.length)
      : null;

  const sWithScore = sEntries.filter((e) => e.score !== null);
  const avgScore =
    sWithScore.length > 0
      ? parseFloat((sWithScore.reduce((a, e) => a + e.score!, 0) / sWithScore.length).toFixed(1))
      : null;

  const sWithDeep = sEntries.filter((e) => e.durationSec !== null && e.deepSec !== null);
  const avgDeepPct =
    sWithDeep.length > 0
      ? parseFloat(
          (sWithDeep.reduce((a, e) => a + e.deepSec! / e.durationSec!, 0) / sWithDeep.length * 100).toFixed(1)
        )
      : null;

  const sWithRem = sEntries.filter((e) => e.durationSec !== null && e.remSec !== null);
  const avgRemPct =
    sWithRem.length > 0
      ? parseFloat(
          (sWithRem.reduce((a, e) => a + e.remSec! / e.durationSec!, 0) / sWithRem.length * 100).toFixed(1)
        )
      : null;

  // ── Strava activities ─────────────────────────────────────────────────────
  const activities: StravaActivityData[] = stravaActivities.map((a) => ({
    id: a.id as number,
    name: a.name as string,
    date: (a.start_date as string).split("T")[0],
    type: a.type as string,
    distanceM: a.distance as number,
    movingTimeSec: a.moving_time as number,
    totalElevationGain: a.total_elevation_gain as number,
    averageHeartrate: (a.average_heartrate as number) ?? null,
  }));

  return {
    weight: { current, delta7d, avg7d, targetKg, deltaFromTarget, entries: wEntries },
    hrv: {
      avg7d: hrvAvg7d,
      latest: latestHrv?.lastNightAvg ?? null,
      latestDate: latestHrv?.date ?? null,
      latestStatus: latestHrv?.status ?? null,
      entries: hEntries,
    },
    restHr: {
      avg7d: restAvg7d,
      min7d: restMin7d,
      max7d: restMax7d,
      entries: rEntries,
    },
    sleep: {
      avgDurationSec,
      avgScore,
      avgDeepPct,
      avgRemPct,
      entries: sEntries,
    },
    activities,
    periodDays: 7,
    generatedAt: new Date(),
  };
}
