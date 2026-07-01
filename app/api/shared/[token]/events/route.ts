import { NextRequest, NextResponse } from "next/server";
import { validateSharedToken } from "@/lib/shared/validateToken";
import connectDB from "@/lib/mongodb";
import StravaEvent from "@/models/StravaEvent";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const shared = await validateSharedToken(token);
  if (!shared) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await connectDB();

  const events = await StravaEvent.find({ userId: shared.userId }).sort({ start_date: 1 }).lean();
  return NextResponse.json(events);
}
