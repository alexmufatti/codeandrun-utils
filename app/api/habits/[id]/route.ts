import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Habit from "@/models/Habit";
import { HABIT_COLORS } from "@/lib/habits/colors";
import HabitCheckin from "@/models/HabitCheckin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, targetPerWeek, color } = body;

  const update: { name?: string; targetPerWeek?: number; color?: string } = {};
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim() || name.length > 80) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    update.name = name.trim();
  }
  if (targetPerWeek !== undefined) {
    if (typeof targetPerWeek !== "number" || targetPerWeek < 1 || targetPerWeek > 14) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    update.targetPerWeek = targetPerWeek;
  }
  if (color !== undefined) {
    if (!HABIT_COLORS.includes(color)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    update.color = color;
  }

  await connectDB();

  const habit = await Habit.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    update,
    { new: true }
  ).lean();

  if (!habit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();

  const habit = await Habit.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    { archived: true }
  ).lean();

  if (!habit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await HabitCheckin.deleteMany({ habitId: id });

  return NextResponse.json({ ok: true });
}
