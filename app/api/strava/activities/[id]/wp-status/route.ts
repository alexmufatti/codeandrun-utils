import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import StravaActivity from "@/models/StravaActivity";
import { isWordPressUser } from "@/lib/wordpress-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isWordPressUser(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { action } = await req.json();
  const stravaId = parseInt(id, 10);

  await connectDB();

  if (action === "clear") {
    await StravaActivity.updateOne(
      { userId: session.user.id, id: stravaId },
      { $unset: { wpPostId: "", wpPostUrl: "", legacyPublished: "" } }
    );
  } else if (action === "mark") {
    await StravaActivity.updateOne(
      { userId: session.user.id, id: stravaId },
      { $set: { legacyPublished: true }, $unset: { wpPostId: "", wpPostUrl: "" } }
    );
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
