import StravaActivity from "@/models/StravaActivity";
import PersonalRecordModel from "@/models/PersonalRecord";

// Aggregazione mensile (distanza, dislivello, attività, tempo) per anno/mese/settimana
export async function getMonthlyStats(userId: string) {
  const data = await StravaActivity.aggregate([
    { $match: { userId, sport_type: "Run" } },
    {
      $project: {
        date: { $dateFromString: { dateString: "$start_date" } },
        distance: 1,
        total_elevation_gain: 1,
        moving_time: 1,
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
          week: { $week: "$date" },
        },
        total_distance: { $sum: "$distance" },
        elevation: { $sum: "$total_elevation_gain" },
        total_moving: { $sum: "$moving_time" },
        avg_distance: { $avg: "$distance" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);
  return data;
}

// Kudos per anno
export async function getKudosPerYear(userId: string) {
  const data = await StravaActivity.aggregate([
    { $match: { userId } },
    {
      $addFields: {
        year: { $year: { $dateFromString: { dateString: "$start_date" } } },
      },
    },
    { $group: { _id: "$year", totalKudos: { $sum: "$kudos_count" } } },
    { $sort: { _id: 1 } },
  ]);
  return data.map((k) => ({ year: k._id as number, kudos: k.totalKudos as number }));
}

// Weekly streak (port da strava-markdown, senza moment.js)
function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - w1.getTime()) / 86400000 -
        3 +
        ((w1.getDay() + 6) % 7)) /
        7
    );
  return `${d.getFullYear()}-${String(weekNum).padStart(2, "0")}`;
}

function mondayOfWeekKey(key: string): Date {
  const [yearStr, weekStr] = key.split("-");
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7);
  return monday;
}

function weeksDiff(k1: string, k2: string): number {
  return Math.round(
    (mondayOfWeekKey(k2).getTime() - mondayOfWeekKey(k1).getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );
}

function formatDate(d: Date): string {
  return d.toISOString().substring(0, 10);
}

export async function getWeeklyStreak(userId: string) {
  const activities = await StravaActivity.find({ userId, sport_type: "Run" })
    .sort({ start_date: 1 })
    .select({ start_date: 1, _id: 0 })
    .lean();

  if (!activities.length) {
    return { longestStreak: 0, longestStartDate: null, longestEndDate: null, currentStreak: 0, currentStartDate: null };
  }

  const weekMap = new Map<string, number>();
  for (const a of activities) {
    const key = isoWeekKey(a.start_date as string);
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
  }

  const validWeeks = [...weekMap.entries()]
    .filter(([, count]) => count >= 3)
    .map(([week]) => week)
    .sort();

  if (!validWeeks.length) {
    return { longestStreak: 0, longestStartDate: null, longestEndDate: null, currentStreak: 0, currentStartDate: null };
  }

  let currentStreak = 1;
  let maxStreak = 1;
  let maxStreakStart = validWeeks[0];
  let maxStreakEnd = validWeeks[0];
  let currentStreakStart = validWeeks[0];

  for (let i = 1; i < validWeeks.length; i++) {
    if (weeksDiff(validWeeks[i - 1], validWeeks[i]) === 1) {
      currentStreak++;
    } else {
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        maxStreakStart = currentStreakStart;
        maxStreakEnd = validWeeks[i - 1];
      }
      currentStreak = 1;
      currentStreakStart = validWeeks[i];
    }
  }
  if (currentStreak > maxStreak) {
    maxStreak = currentStreak;
    maxStreakStart = currentStreakStart;
    maxStreakEnd = validWeeks[validWeeks.length - 1];
  }

  const now = new Date();
  const currentWeekKey = isoWeekKey(now.toISOString());
  const lastWeek = new Date(now);
  lastWeek.setDate(now.getDate() - 7);
  const lastWeekKey = isoWeekKey(lastWeek.toISOString());

  const hasCurrentWeek = (weekMap.get(currentWeekKey) ?? 0) >= 3;
  const hasLastWeek = (weekMap.get(lastWeekKey) ?? 0) >= 3;

  let activeStreak = 0;
  let activeStreakStart: string | null = null;

  if (hasCurrentWeek || hasLastWeek) {
    const startWeek = hasCurrentWeek ? currentWeekKey : lastWeekKey;
    const startIndex = validWeeks.indexOf(startWeek);
    if (startIndex !== -1) {
      for (let i = startIndex; i >= 0; i--) {
        activeStreak++;
        activeStreakStart = validWeeks[i];
        if (i === 0) break;
        if (weeksDiff(validWeeks[i - 1], validWeeks[i]) !== 1) break;
      }
    }
  }

  return {
    longestStreak: maxStreak,
    longestStartDate: formatDate(mondayOfWeekKey(maxStreakStart)),
    longestEndDate: formatDate(mondayOfWeekKey(maxStreakEnd)),
    currentStreak: activeStreak,
    currentStartDate: activeStreakStart ? formatDate(mondayOfWeekKey(activeStreakStart)) : null,
  };
}

// Statistiche per giorno della settimana
export async function getDayOfWeekStats(userId: string) {
  const dayNames = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  const data = await StravaActivity.aggregate([
    { $match: { userId, sport_type: "Run" } },
    {
      $project: {
        date: { $dateFromString: { dateString: "$start_date" } },
        distance: 1,
      },
    },
    { $project: { dayOfWeek: { $dayOfWeek: "$date" }, distance: 1 } },
    {
      $group: {
        _id: "$dayOfWeek",
        count: { $sum: 1 },
        totalDistance: { $sum: "$distance" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return data.map((s) => ({
    day: dayNames[s._id - 1],
    count: s.count as number,
    totalDistance: Math.round(s.totalDistance),
    avgDistance: Math.round(s.totalDistance / s.count),
  }));
}

// Record personali (inseriti manualmente)
export type PersonalRecord = {
  name: string;
  distanceMeters: number;
  elapsedTime: number; // secondi
  activityName: string;
  startDate: string;
};

export async function getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
  const data = await PersonalRecordModel.find({ userId }).sort({ distanceMeters: 1 }).lean();
  return data.map((d: any) => ({
    name: d.name as string,
    distanceMeters: d.distanceMeters as number,
    elapsedTime: d.elapsedTime as number,
    activityName: d.activityName as string,
    startDate: d.raceDate as string,
  }));
}

// Top 5 corse per distanza
export async function getTopRuns(userId: string) {
  return StravaActivity.find({ userId, sport_type: "Run" })
    .sort({ distance: -1 })
    .limit(5)
    .select({ id: 1, name: 1, start_date: 1, distance: 1, total_elevation_gain: 1, average_speed: 1, moving_time: 1, _id: 0 })
    .lean();
}

// Totali per anno (per tabella e publish)
export function computeYearTotals(
  monthlyData: any[],
  kudosData: { year: number; kudos: number }[]
) {
  const yearMap = new Map<number, { total_distance: number; elevation: number; count: number; total_moving: number }>();
  for (const d of monthlyData) {
    const y = d._id.year;
    const existing = yearMap.get(y) ?? { total_distance: 0, elevation: 0, count: 0, total_moving: 0 };
    yearMap.set(y, {
      total_distance: existing.total_distance + d.total_distance,
      elevation: existing.elevation + d.elevation,
      count: existing.count + d.count,
      total_moving: existing.total_moving + d.total_moving,
    });
  }

  return [...yearMap.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, totals]) => ({
      year,
      ...totals,
      kudos: kudosData.find((k) => k.year === year)?.kudos ?? 0,
    }));
}

// Dati cumulativi mensili per Google Charts
export function buildChartData(monthlyData: any[]) {
  const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  const years = [...new Set(monthlyData.map((d) => d._id.year as number))].sort();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const rows = months.map((monthName, i) => {
    const monthNum = i + 1;
    return [
      monthName,
      ...years.map((year) => {
        if (year === currentYear && monthNum > currentMonth) return null;
        const cumulative = monthlyData
          .filter((d) => d._id.year === year && d._id.month <= monthNum)
          .reduce((acc, d) => acc + d.total_distance / 1000, 0);
        return Math.round(cumulative * 10) / 10;
      }),
    ];
  });

  return { header: ["Mese", ...years.map(String)], rows, years };
}
