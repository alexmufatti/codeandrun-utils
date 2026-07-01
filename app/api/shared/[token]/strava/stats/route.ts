import { NextRequest, NextResponse } from "next/server";
import { validateSharedToken } from "@/lib/shared/validateToken";
import connectDB from "@/lib/mongodb";
import StravaActivity from "@/models/StravaActivity";
import { getMonthlyStats } from "@/lib/strava/stats";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const shared = await validateSharedToken(token);
  if (!shared) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await connectDB();

  const [data, lastActivity] = await Promise.all([
    getMonthlyStats(shared.userId),
    StravaActivity.findOne({ userId: shared.userId })
      .sort({ start_date: -1 })
      .select({ start_date: 1 })
      .lean(),
  ]);

  return NextResponse.json({ data, lastUpdate: (lastActivity as any)?.start_date ?? null });
}
