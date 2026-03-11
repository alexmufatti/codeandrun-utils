import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import StravaActivity from "@/models/StravaActivity";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  await connectDB();

  const activities = await StravaActivity.find({ userId: session.user.id })
    .sort({ start_date: -1 })
    .skip((page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .select({
      id: 1,
      name: 1,
      start_date_local: 1,
      sport_type: 1,
      distance: 1,
      moving_time: 1,
      wpPostId: 1,
      wpPostUrl: 1,
      legacyPublished: 1,
    })
    .lean();

  const total = await StravaActivity.countDocuments({ userId: session.user.id });

  return NextResponse.json({
    activities,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
    total,
  });
}
