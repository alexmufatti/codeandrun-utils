import { NextRequest, NextResponse } from "next/server";
import { validateSharedToken } from "@/lib/shared/validateToken";
import connectDB from "@/lib/mongodb";
import StravaActivity from "@/models/StravaActivity";

const PAGE_SIZE = 30;

type Params = { params: Promise<{ token: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const shared = await validateSharedToken(token);
  if (!shared) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  await connectDB();

  const [activities, total] = await Promise.all([
    StravaActivity.find({ userId: shared.userId })
      .sort({ start_date: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .select({ id: 1, name: 1, start_date_local: 1, sport_type: 1, distance: 1, moving_time: 1 })
      .lean(),
    StravaActivity.countDocuments({ userId: shared.userId }),
  ]);

  return NextResponse.json({
    activities,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
    total,
  });
}
