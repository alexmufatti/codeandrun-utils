import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import UserSettings from "@/models/UserSettings";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const settings = await UserSettings.findOne({
    userId: session.user.id,
  }).lean();

  return NextResponse.json({
    hrMaxBpm: settings?.hrMaxBpm ?? null,
    hrRestingBpm: settings?.hrRestingBpm ?? null,
    hrZoneMethod: settings?.hrZoneMethod ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { hrMaxBpm, hrRestingBpm, hrZoneMethod } = body;

  if (
    hrMaxBpm !== null &&
    (typeof hrMaxBpm !== "number" || hrMaxBpm <= 0 || hrMaxBpm > 250)
  ) {
    return NextResponse.json({ error: "Invalid hrMaxBpm" }, { status: 400 });
  }

  if (
    hrRestingBpm !== null &&
    (typeof hrRestingBpm !== "number" || hrRestingBpm <= 0 || hrRestingBpm > 200)
  ) {
    return NextResponse.json({ error: "Invalid hrRestingBpm" }, { status: 400 });
  }

  if (
    hrZoneMethod !== null &&
    hrZoneMethod !== "max" &&
    hrZoneMethod !== "karvonen"
  ) {
    return NextResponse.json({ error: "Invalid hrZoneMethod" }, { status: 400 });
  }

  await connectDB();

  await UserSettings.findOneAndUpdate(
    { userId: session.user.id },
    { userId: session.user.id, hrMaxBpm, hrRestingBpm, hrZoneMethod, updatedAt: new Date() },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({ hrMaxBpm, hrRestingBpm, hrZoneMethod });
}
