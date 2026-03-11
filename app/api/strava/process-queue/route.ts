import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import StravaUpdate from "@/models/StravaUpdate";
import StravaActivity from "@/models/StravaActivity";
import StravaConnection from "@/models/StravaConnection";
import { getStravaAccessToken } from "@/lib/strava/getAccessToken";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.PROCESS_QUEUE_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const updates = await StravaUpdate.find()
    .sort({ createdAt: 1 })
    .limit(50)
    .lean();

  let processed = 0;
  let errors = 0;

  for (const update of updates) {
    try {
      if (update.object_type === "activity") {
        const conn = await StravaConnection.findOne({
          athleteId: update.owner_id,
        }).lean();

        if (conn) {
          if (update.aspect_type === "delete") {
            await StravaActivity.deleteOne({
              id: update.object_id,
              userId: conn.userId,
            });
          } else {
            const accessToken = await getStravaAccessToken(conn.userId);
            const res = await fetch(
              `https://www.strava.com/api/v3/activities/${update.object_id}`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (res.ok) {
              const activity = await res.json();
              await StravaActivity.findOneAndUpdate(
                { id: activity.id, userId: conn.userId },
                { ...activity, userId: conn.userId, athleteId: update.owner_id },
                { upsert: true }
              );
            }
          }
        }
      }

      await StravaUpdate.deleteOne({ _id: update._id });
      processed++;
    } catch (err) {
      console.error(`Error processing update ${update._id}:`, err);
      errors++;
    }
  }

  return NextResponse.json({ processed, errors });
}
