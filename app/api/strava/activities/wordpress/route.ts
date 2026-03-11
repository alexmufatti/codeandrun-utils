import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import StravaActivity from "@/models/StravaActivity";
import { createWordPressDraft } from "@/lib/strava/wordpress";
import { isWordPressUser } from "@/lib/wordpress-auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isWordPressUser(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.WP_SITE_URL || !process.env.WP_USERNAME || !process.env.WP_APP_PASSWORD) {
    return NextResponse.json({ error: "WordPress not configured" }, { status: 500 });
  }

  const { activityIds, title } = await req.json();
  if (!Array.isArray(activityIds) || activityIds.length === 0) {
    return NextResponse.json({ error: "No activities selected" }, { status: 400 });
  }

  await connectDB();

  const activities = await StravaActivity.find({
    userId: session.user.id,
    id: { $in: activityIds },
  }).lean();

  if (activities.length === 0) {
    return NextResponse.json({ error: "Activities not found" }, { status: 404 });
  }

  const { postId, postUrl } = await createWordPressDraft(activities, title);

  // Marca le attività come pubblicate su WP
  await StravaActivity.updateMany(
    { userId: session.user.id, id: { $in: activityIds } },
    { $set: { wpPostId: postId, wpPostUrl: postUrl } }
  );

  return NextResponse.json({ postId, postUrl });
}
