import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import StravaActivity from "@/models/StravaActivity";
import { generateAstroDraft } from "@/lib/strava/astro-draft";
import { isWordPressUser } from "@/lib/wordpress-auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isWordPressUser(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const draft = await generateAstroDraft(activities, title);
  const astroPostUrl = `/${draft.slug}/`;

  await StravaActivity.updateMany(
    { userId: session.user.id, id: { $in: activityIds } },
    { $set: { astroSlug: draft.slug, astroPostUrl } }
  );

  return NextResponse.json(draft);
}
