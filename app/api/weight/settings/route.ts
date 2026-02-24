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
    targetWeightKg: settings?.targetWeightKg ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { targetWeightKg } = body;

  if (
    targetWeightKg !== null &&
    (typeof targetWeightKg !== "number" ||
      targetWeightKg < 30 ||
      targetWeightKg > 300)
  ) {
    return NextResponse.json(
      { error: "Target weight must be between 30 and 300 kg" },
      { status: 400 }
    );
  }

  await connectDB();

  const settings = await UserSettings.findOneAndUpdate(
    { userId: session.user.id },
    { userId: session.user.id, targetWeightKg, updatedAt: new Date() },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({
    targetWeightKg: settings!.targetWeightKg,
  });
}
