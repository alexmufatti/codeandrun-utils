import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { getWeeklyStreak } from "@/lib/strava/stats";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const data = await getWeeklyStreak(session.user.id);
  return NextResponse.json(data);
}
