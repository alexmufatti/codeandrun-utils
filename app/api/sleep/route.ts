import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SleepEntry from "@/models/SleepEntry";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? "2000-01-01";

  await connectDB();

  const entries = await SleepEntry.find({
    userId: session.user.id,
    calendarDate: { $gte: from },
  })
    .sort({ calendarDate: 1 })
    .lean();

  return NextResponse.json({ sleep: entries });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { calendarDate, perceivedQuality, awakenings, notes } = body;

  if (!calendarDate) {
    return NextResponse.json({ error: "calendarDate required" }, { status: 400 });
  }

  await connectDB();

  const update: Record<string, unknown> = {};
  if (perceivedQuality !== undefined) update.perceivedQuality = perceivedQuality;
  if (awakenings !== undefined) update.awakenings = awakenings;
  if (notes !== undefined) update.notes = notes;

  const entry = await SleepEntry.findOneAndUpdate(
    { userId: session.user.id, calendarDate },
    { $set: update },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({ sleep: entry });
}
