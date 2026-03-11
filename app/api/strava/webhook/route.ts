import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import StravaUpdate from "@/models/StravaUpdate";

// GET — Strava webhook subscription verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = searchParams.get("hub.verify_token");

  if (mode === "subscribe" && verifyToken === process.env.STRAVA_VERIFY_TOKEN) {
    return NextResponse.json({ "hub.challenge": challenge });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// POST — Receive webhook event, save to queue, respond immediately
export async function POST(req: NextRequest) {
  const body = await req.json();
  await connectDB();
  await StravaUpdate.create({ ...body, createdAt: new Date() });
  return new NextResponse(null, { status: 200 });
}
