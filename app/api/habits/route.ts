import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Habit, { STRAVA_HABIT_TYPES } from "@/models/Habit";
import { HABIT_COLORS } from "@/lib/habits/colors";
import HabitCheckin from "@/models/HabitCheckin";
import StravaActivity from "@/models/StravaActivity";

const HISTORY_WEEKS = 53;

function getMondayOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  await connectDB();

  const habits = await Habit.find({ userId, archived: false }).sort({ order: 1 }).lean();

  const weekStart = getMondayOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const historyStart = new Date(weekStart);
  historyStart.setUTCDate(historyStart.getUTCDate() - (HISTORY_WEEKS - 1) * 7);
  const historyStartStr = historyStart.toISOString().split("T")[0];

  const manualIds = habits.filter((h) => h.kind === "manual").map((h) => h._id.toString());
  const stravaTypes = [
    ...new Set(habits.filter((h) => h.kind === "strava").map((h) => h.stravaType)),
  ];

  const [checkins, activities] = await Promise.all([
    manualIds.length
      ? HabitCheckin.find({
          habitId: { $in: manualIds },
          date: { $gte: historyStart, $lt: weekEnd },
        }).lean()
      : Promise.resolve([]),
    stravaTypes.length
      ? StravaActivity.find({
          userId,
          sport_type: { $in: stravaTypes },
          start_date: { $gte: historyStartStr },
        })
          .select({ sport_type: 1, start_date: 1, _id: 0 })
          .lean()
      : Promise.resolve([]),
  ]);

  const historyByHabit = new Map<string, Set<string>>();
  for (const c of checkins) {
    const key = c.habitId;
    const dateStr = c.date.toISOString().split("T")[0];
    if (!historyByHabit.has(key)) historyByHabit.set(key, new Set());
    historyByHabit.get(key)!.add(dateStr);
  }

  const historyByStravaType = new Map<string, Set<string>>();
  for (const a of activities as unknown as { sport_type: string; start_date: string }[]) {
    const dateStr = a.start_date.slice(0, 10);
    if (!historyByStravaType.has(a.sport_type)) historyByStravaType.set(a.sport_type, new Set());
    historyByStravaType.get(a.sport_type)!.add(dateStr);
  }

  const data = habits.map((h) => {
    const id = h._id.toString();
    const history = [
      ...(h.kind === "manual"
        ? (historyByHabit.get(id) ?? new Set<string>())
        : (historyByStravaType.get(h.stravaType!) ?? new Set<string>())),
    ].sort();
    const progress = history.filter((d) => d >= weekStartStr).length;

    if (h.kind === "manual") {
      return {
        _id: id,
        name: h.name,
        kind: h.kind,
        targetPerWeek: h.targetPerWeek,
        color: h.color ?? HABIT_COLORS[0],
        progress,
        checkedDates: history.filter((d) => d >= weekStartStr),
        history,
      };
    }
    return {
      _id: id,
      name: h.name,
      kind: h.kind,
      stravaType: h.stravaType,
      targetPerWeek: h.targetPerWeek,
      color: h.color,
      progress,
      history,
    };
  });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, kind, stravaType, targetPerWeek, color } = body;

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.length > 80 ||
    (kind !== "manual" && kind !== "strava") ||
    typeof targetPerWeek !== "number" ||
    targetPerWeek < 1 ||
    targetPerWeek > 14 ||
    (kind === "strava" && !STRAVA_HABIT_TYPES.includes(stravaType)) ||
    (color !== undefined && !HABIT_COLORS.includes(color))
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await connectDB();

  const last = await Habit.findOne({ userId: session.user.id, archived: false })
    .sort({ order: -1 })
    .lean();

  const habit = await Habit.create({
    userId: session.user.id,
    name: name.trim(),
    kind,
    stravaType: kind === "strava" ? stravaType : undefined,
    targetPerWeek,
    color: color ?? HABIT_COLORS[0],
    order: last ? last.order + 1 : 0,
  });

  return NextResponse.json({ _id: habit._id.toString() });
}
