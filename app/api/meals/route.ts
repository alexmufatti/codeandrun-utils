import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import MealPlan from "@/models/MealPlan";

const VALID_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const week = searchParams.get("week");
  if (!week || !/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    return NextResponse.json({ error: "Invalid week" }, { status: 400 });
  }

  const weekStart = new Date(week + "T00:00:00Z");
  if (isNaN(weekStart.getTime())) {
    return NextResponse.json({ error: "Invalid week" }, { status: 400 });
  }

  await connectDB();

  const entries = await MealPlan.find({ userId: session.user.id, weekStart }).lean();

  return NextResponse.json(
    entries.map((e) => ({ day: e.day, mealType: e.mealType, content: e.content }))
  );
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  if (isNaN(weekStart.getTime())) {
    return NextResponse.json({ error: "Invalid week" }, { status: 400 });
  }

  await connectDB();

  await MealPlan.findOneAndUpdate(
    { userId: session.user.id, weekStart, day, mealType },
    { content: content.trim(), updatedAt: new Date() },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}
