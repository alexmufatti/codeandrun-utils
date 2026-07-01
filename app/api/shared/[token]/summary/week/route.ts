import { NextRequest, NextResponse } from "next/server";
import { validateSharedToken } from "@/lib/shared/validateToken";
import connectDB from "@/lib/mongodb";
import WeightEntry from "@/models/WeightEntry";
import HrvEntry from "@/models/HrvEntry";
import RestHrEntry from "@/models/RestHrEntry";
import SleepEntry from "@/models/SleepEntry";
import StravaActivity from "@/models/StravaActivity";

type Params = { params: Promise<{ token: string }> };

function weekAgoDate(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - 7);
  return d;
}

function weekAgoString(): string {
  return weekAgoDate().toISOString().split("T")[0];
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const shared = await validateSharedToken(token);
  if (!shared) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId = shared.userId;
  const fromDate = weekAgoDate();
  const fromStr = weekAgoString();

  await connectDB();

  const [weightEntries, hrvEntries, resthrEntries, sleepEntries, stravaActivities] =
    await Promise.all([
      WeightEntry.find({ userId, date: { $gte: fromDate } }).sort({ date: 1 }).lean(),
      HrvEntry.find({ userId, calendarDate: { $gte: fromStr } })
        .sort({ calendarDate: 1 })
        .select({ calendarDate: 1, lastNightAvg: 1, weeklyAvg: 1, status: 1, _id: 0 })
        .lean(),
      RestHrEntry.find({ userId, calendarDate: { $gte: fromStr } })
        .sort({ calendarDate: 1 })
        .select({ calendarDate: 1, values: 1, _id: 0 })
        .lean(),
      SleepEntry.find({ userId, calendarDate: { $gte: fromStr } })
        .sort({ calendarDate: 1 })
        .select({ calendarDate: 1, sleepTimeSeconds: 1, sleepScore: 1, _id: 0 })
        .lean(),
      StravaActivity.find({ userId, start_date: { $gte: fromStr } })
        .sort({ start_date: -1 })
        .select({ id: 1, name: 1, sport_type: 1, distance: 1, moving_time: 1, start_date_local: 1, total_elevation_gain: 1, _id: 0 })
        .lean(),
    ]);

  const latestWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1] : null;
  const oldestWeight = weightEntries.length > 0 ? weightEntries[0] : null;
  const weightDelta =
    latestWeight && oldestWeight && latestWeight !== oldestWeight
      ? (latestWeight as any).weightKg - (oldestWeight as any).weightKg
      : null;

  const hrvWithValue = (hrvEntries as any[]).filter((e) => e.lastNightAvg != null);
  const avgHrv =
    hrvWithValue.length > 0
      ? Math.round((hrvWithValue.reduce((s: number, e: any) => s + e.lastNightAvg, 0) / hrvWithValue.length) * 10) / 10
      : null;
  const latestHrv = (hrvEntries as any[]).length > 0 ? (hrvEntries as any[])[hrvEntries.length - 1] : null;

  const resthrWithValue = (resthrEntries as any[]).filter((e) => e.values?.restingHR != null);
  const avgRestHr =
    resthrWithValue.length > 0
      ? Math.round(resthrWithValue.reduce((s: number, e: any) => s + e.values.restingHR, 0) / resthrWithValue.length)
      : null;

  const sleepWithDuration = (sleepEntries as any[]).filter((e) => e.sleepTimeSeconds != null);
  const avgSleepSeconds =
    sleepWithDuration.length > 0
      ? sleepWithDuration.reduce((s: number, e: any) => s + e.sleepTimeSeconds, 0) / sleepWithDuration.length
      : null;
  const sleepWithScore = (sleepEntries as any[]).filter((e) => e.sleepScore != null);
  const avgSleepScore =
    sleepWithScore.length > 0
      ? Math.round(sleepWithScore.reduce((s: number, e: any) => s + e.sleepScore, 0) / sleepWithScore.length)
      : null;

  const totalDistance = (stravaActivities as any[]).reduce((s: number, a: any) => s + (a.distance ?? 0), 0);
  const totalMovingTime = (stravaActivities as any[]).reduce((s: number, a: any) => s + (a.moving_time ?? 0), 0);
  const runActivities = (stravaActivities as any[]).filter(
    (a) => a.sport_type === "Run" || a.sport_type === "TrailRun" || a.sport_type === "VirtualRun"
  );

  return NextResponse.json({
    weight: {
      latest: latestWeight ? { date: (latestWeight as any).date.toISOString().split("T")[0], weightKg: (latestWeight as any).weightKg } : null,
      delta: weightDelta,
      entriesCount: weightEntries.length,
    },
    hrv: {
      avg: avgHrv,
      latestStatus: latestHrv?.status ?? null,
      latestLastNight: latestHrv?.lastNightAvg ?? null,
      latestDate: latestHrv?.calendarDate ?? null,
      entriesCount: hrvEntries.length,
    },
    resthr: { avg: avgRestHr, entriesCount: resthrEntries.length },
    sleep: { avgSeconds: avgSleepSeconds, avgScore: avgSleepScore, entriesCount: sleepEntries.length },
    strava: {
      activities: (stravaActivities as any[]).map((a) => ({
        id: a.id, name: a.name, sport_type: a.sport_type,
        distance: a.distance, moving_time: a.moving_time,
        start_date_local: a.start_date_local, total_elevation_gain: a.total_elevation_gain,
      })),
      totalDistance,
      totalMovingTime,
      count: (stravaActivities as any[]).length,
      runCount: runActivities.length,
    },
  });
}
