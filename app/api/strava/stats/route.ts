import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import StravaActivity from "@/models/StravaActivity";
import { getMonthlyStats } from "@/lib/strava/stats";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const [data, lastActivity] = await Promise.all([
    getMonthlyStats(session.user.id),
    StravaActivity.findOne({ userId: session.user.id })
      .sort({ start_date: -1 })
      .select({ start_date: 1 })
      .lean(),
  ]);

  return NextResponse.json({ data, lastUpdate: (lastActivity as any)?.start_date ?? null });
}
