import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MealShare from "@/models/MealShare";
import MealPlan from "@/models/MealPlan";

const VALID_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const TOKEN_RE = /^[0-9a-f]{48}$/;

type Params = { params: Promise<{ token: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const week = searchParams.get("week");
  if (!week || !/^\d{4}-\d{2}-\d{2}$/.test(week))
    return NextResponse.json({ error: "Invalid week" }, { status: 400 });

  const weekStart = new Date(week + "T00:00:00Z");
  if (isNaN(weekStart.getTime()))
    return NextResponse.json({ error: "Invalid week" }, { status: 400 });

  await connectDB();
  const share = await MealShare.findOne({ token }).lean();
  if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const entries = await MealPlan.find({ userId: share.userId, weekStart }).lean();
  return NextResponse.json(
    entries.map((e) => ({ day: e.day, mealType: e.mealType, content: e.content }))
  );
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await connectDB();
  const share = await MealShare.findOne({ token }).lean();
  if (!share) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!share.canWrite) return NextResponse.json({ error: "Read only" }, { status: 403 });

  const body = await req.json();
  const { weekStart: weekStr, day, mealType, content } = body;

  if (
    typeof weekStr !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(weekStr) ||
    typeof day !== "number" ||
    day < 0 ||
    day > 6 ||
    !VALID_MEAL_TYPES.includes(mealType) ||
    typeof content !== "string" ||
    content.length > 500
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const weekStart = new Date(weekStr + "T00:00:00Z");
  if (isNaN(weekStart.getTime()))
    return NextResponse.json({ error: "Invalid week" }, { status: 400 });

  await MealPlan.findOneAndUpdate(
    { userId: share.userId, weekStart, day, mealType },
    { content: content.trim(), updatedAt: new Date() },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}
