import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import StravaConnection from "@/models/StravaConnection";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  await StravaConnection.deleteOne({ userId: session.user.id });

  return NextResponse.json({ ok: true });
}
