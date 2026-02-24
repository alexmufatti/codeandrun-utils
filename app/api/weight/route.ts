import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import WeightEntry from "@/models/WeightEntry";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30", 10);
  const validDays = [30, 90, 365].includes(days) ? days : 30;

  const since = new Date();
  since.setDate(since.getDate() - validDays);

  await connectDB();

  const entries = await WeightEntry.find({
    userId: session.user.id,
    date: { $gte: since },
  })
    .sort({ date: 1 })
    .lean();

  const data = entries.map((e) => ({
    _id: e._id.toString(),
    date: e.date.toISOString().split("T")[0],
    weightKg: e.weightKg,
  }));

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date, weightKg } = body;

  if (!date || typeof weightKg !== "number") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (weightKg < 30 || weightKg > 300) {
    return NextResponse.json(
      { error: "Weight must be between 30 and 300 kg" },
      { status: 400 }
    );
  }

  const parsedDate = new Date(date);
  parsedDate.setUTCHours(0, 0, 0, 0);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (parsedDate > today) {
    return NextResponse.json(
      { error: "Date cannot be in the future" },
      { status: 400 }
    );
  }

  await connectDB();

  const entry = await WeightEntry.findOneAndUpdate(
    { userId: session.user.id, date: parsedDate },
    { userId: session.user.id, date: parsedDate, weightKg, createdAt: new Date() },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({
    _id: entry!._id.toString(),
    date: parsedDate.toISOString().split("T")[0],
    weightKg: entry!.weightKg,
  });
}
