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
    vdotDistanceM: settings?.vdotDistanceM ?? null,
    vdotTimeInput: settings?.vdotTimeInput ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { vdotDistanceM, vdotTimeInput } = body;

  if (
    vdotDistanceM !== null &&
    (typeof vdotDistanceM !== "number" || vdotDistanceM <= 0)
  ) {
    return NextResponse.json({ error: "Invalid distance" }, { status: 400 });
  }

  if (
    vdotTimeInput !== null &&
    typeof vdotTimeInput !== "string"
  ) {
    return NextResponse.json({ error: "Invalid time input" }, { status: 400 });
  }

  await connectDB();

  await UserSettings.findOneAndUpdate(
    { userId: session.user.id },
    { userId: session.user.id, vdotDistanceM, vdotTimeInput, updatedAt: new Date() },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({ vdotDistanceM, vdotTimeInput });
}
