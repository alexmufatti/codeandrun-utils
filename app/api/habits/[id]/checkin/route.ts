import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Habit from "@/models/Habit";
import HabitCheckin from "@/models/HabitCheckin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { date } = body;

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const parsedDate = new Date(date + "T00:00:00Z");
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  await connectDB();

  const habit = await Habit.findOne({
    _id: id,
    userId: session.user.id,
    kind: "manual",
    archived: false,
  }).lean();

  if (!habit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await HabitCheckin.findOneAndDelete({ habitId: id, date: parsedDate });

  if (!existing) {
    await HabitCheckin.create({ userId: session.user.id, habitId: id, date: parsedDate });
  }

  return NextResponse.json({ done: !existing });
}
