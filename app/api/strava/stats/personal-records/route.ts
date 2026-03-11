import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import PersonalRecordModel from "@/models/PersonalRecord";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const data = await PersonalRecordModel.find({ userId: session.user.id })
    .sort({ distanceMeters: 1 })
    .lean();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, distanceMeters, elapsedTime, activityName, raceDate } = await req.json();
  if (!name || !distanceMeters || !elapsedTime) {
    return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 });
  }

  await connectDB();
  const doc = await PersonalRecordModel.findOneAndUpdate(
    { userId: session.user.id, name },
    { userId: session.user.id, name, distanceMeters, elapsedTime, activityName: activityName ?? "", raceDate: raceDate ?? "" },
    { upsert: true, new: true }
  );
  return NextResponse.json(doc);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  if (!name) return NextResponse.json({ error: "Parametro name mancante" }, { status: 400 });

  await connectDB();
  await PersonalRecordModel.deleteOne({ userId: session.user.id, name });
  return NextResponse.json({ ok: true });
}
