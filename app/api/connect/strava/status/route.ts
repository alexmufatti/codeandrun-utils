import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import StravaConnection from "@/models/StravaConnection";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const connection = await StravaConnection.findOne({
    userId: session.user.id,
  }).lean();

  if (!connection) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    athleteId: connection.athleteId,
    athleteFirstname: connection.athleteFirstname,
    athleteLastname: connection.athleteLastname,
  });
}
