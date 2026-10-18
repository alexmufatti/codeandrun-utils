import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import StravaConnection from "@/models/StravaConnection";
import StravaUpdate from "@/models/StravaUpdate";

const OBJECT_TYPES = ["activity", "athlete"];
const ASPECT_TYPES = ["create", "update", "delete"];

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

// POST — Receive webhook event, save to queue, respond immediately.
// Strava does not sign events, so anyone who knows the URL can post here:
// only well-formed events, from our subscription (when STRAVA_SUBSCRIPTION_ID
// is set) and about an athlete with a connection are queued. Ignored events
// still get 200 so Strava does not retry them.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (
    !body ||
    !OBJECT_TYPES.includes(body.object_type) ||
    !ASPECT_TYPES.includes(body.aspect_type) ||
    !Number.isSafeInteger(body.object_id) ||
    !Number.isSafeInteger(body.owner_id) ||
    !Number.isSafeInteger(body.subscription_id) ||
    !Number.isSafeInteger(body.event_time)
  ) {
    return new NextResponse(null, { status: 400 });
  }

  const subscriptionId = process.env.STRAVA_SUBSCRIPTION_ID;
  if (subscriptionId && String(body.subscription_id) !== subscriptionId) {
    return new NextResponse(null, { status: 200 });
  }

  await connectDB();

  const known = await StravaConnection.exists({ athleteId: body.owner_id });
  if (!known) {
    return new NextResponse(null, { status: 200 });
  }

  await StravaUpdate.create({
    aspect_type: body.aspect_type,
    event_time: body.event_time,
    object_id: body.object_id,
    object_type: body.object_type,
    owner_id: body.owner_id,
    subscription_id: body.subscription_id,
    updates: body.updates,
    createdAt: new Date(),
  });
  return new NextResponse(null, { status: 200 });
}
