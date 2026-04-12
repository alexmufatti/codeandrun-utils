import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import EmailReportSettings from "@/models/EmailReportSettings";
import { sendWeeklyReport } from "@/lib/email/sendReport";

/**
 * POST /api/report/send
 *
 * Two callers:
 *  1. Cron (garmin-sync): header x-cron-secret = PROCESS_QUEUE_SECRET
 *     Iterates all users with reportEnabled=true and sends if schedule matches.
 *     Query param ?force=true skips the schedule check.
 *
 *  2. Authenticated user from the UI: normal session cookie.
 *     Always sends immediately (acts as ?force=true for the calling user).
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get("x-cron-secret");
  const isCron =
    cronSecret && cronSecret === process.env.PROCESS_QUEUE_SECRET;

  const force = req.nextUrl.searchParams.get("force") === "true";

  if (!isCron) {
    // Must be an authenticated session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const settings = await EmailReportSettings.findOne({
      userId: session.user.id,
    }).lean();

    if (!settings?.reportEnabled || settings.reportRecipients.length === 0) {
      return NextResponse.json(
        { error: "Report not configured or disabled" },
        { status: 400 }
      );
    }

    await sendWeeklyReport(session.user.id, settings.reportRecipients);
    await EmailReportSettings.updateOne(
      { userId: session.user.id },
      { reportLastSentAt: new Date() }
    );

    return NextResponse.json({ sent: 1 });
  }

  // ── Cron path ─────────────────────────────────────────────────────────────
  await connectDB();

  const allSettings = await EmailReportSettings.find({
    reportEnabled: true,
    reportRecipients: { $not: { $size: 0 } },
  }).lean();

  const now = new Date();
  const todayDow = now.getDay(); // 0=Sun
  const todayDom = now.getDate();

  let sent = 0;
  let errors = 0;

  for (const s of allSettings) {
    const shouldSend = force || shouldSendNow(s, now, todayDow, todayDom);
    if (!shouldSend) continue;

    try {
      await sendWeeklyReport(s.userId, s.reportRecipients);
      await EmailReportSettings.updateOne(
        { _id: s._id },
        { reportLastSentAt: now }
      );
      sent++;
    } catch (err) {
      console.error(`Report send failed for userId=${s.userId}:`, err);
      errors++;
    }
  }

  return NextResponse.json({ sent, errors });
}

function shouldSendNow(
  s: {
    reportFrequency: string;
    reportDayOfWeek: number;
    reportLastSentAt: Date | null;
  },
  now: Date,
  todayDow: number,
  todayDom: number
): boolean {
  const last = s.reportLastSentAt ? new Date(s.reportLastSentAt) : null;

  // Avoid double-sending on the same calendar day
  if (last) {
    const lastDate = last.toISOString().split("T")[0];
    const todayDate = now.toISOString().split("T")[0];
    if (lastDate === todayDate) return false;
  }

  if (s.reportFrequency === "daily") return true;

  if (s.reportFrequency === "weekly") {
    return todayDow === s.reportDayOfWeek;
  }

  if (s.reportFrequency === "monthly") {
    return todayDom === 1; // first of month
  }

  return false;
}
