import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import MealShare from "@/models/MealShare";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const share = await MealShare.findOne({ userId: session.user.id }).lean();
  return NextResponse.json(share ? { token: share.token, canWrite: share.canWrite } : { token: null });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const token = crypto.randomBytes(24).toString("hex");
  const share = await MealShare.findOneAndUpdate(
    { userId: session.user.id },
    { token, canWrite: false, createdAt: new Date() },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({ token: share!.token, canWrite: share!.canWrite });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { canWrite } = await req.json();
  if (typeof canWrite !== "boolean") return NextResponse.json({ error: "Invalid" }, { status: 400 });

  await connectDB();
  const share = await MealShare.findOneAndUpdate(
    { userId: session.user.id },
    { canWrite },
    { new: true }
  ).lean();

  if (!share) return NextResponse.json({ error: "No share" }, { status: 404 });
  return NextResponse.json({ token: share.token, canWrite: share.canWrite });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  await MealShare.deleteOne({ userId: session.user.id });
  return NextResponse.json({ ok: true });
}
