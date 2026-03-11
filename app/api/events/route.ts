import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import StravaEvent from "@/models/StravaEvent";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const events = await StravaEvent.find({ userId: session.user.id })
    .sort({ start_date: 1 })
    .lean();

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { description, start_date, end_date, type } = await req.json();
  if (!description || !start_date || !end_date) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await connectDB();

  const event = await StravaEvent.create({
    userId: session.user.id,
    description,
    start_date,
    end_date,
    type: type ?? "",
  });

  return NextResponse.json(event);
}
