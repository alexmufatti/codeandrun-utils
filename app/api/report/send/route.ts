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
 *     Test send, rate-limited to one per TEST_COOLDOWN_MS. Does not touch
 *     reportLastSentAt, so it never blocks the scheduled weekly send.
 */
const TEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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

    // Atomically claim the cooldown slot before sending.
    const now = new Date();
    const claimed = await EmailReportSettings.findOneAndUpdate(
      {
        userId: session.user.id,
        $or: [
          { reportLastTestAt: null },
          { reportLastTestAt: { $lte: new Date(now.getTime() - TEST_COOLDOWN_MS) } },
        ],
      },
      { reportLastTestAt: now },
      { new: false }
    ).lean();

    if (!claimed) {
      const last = settings.reportLastTestAt
        ? new Date(settings.reportLastTestAt).getTime()
        : now.getTime();
      return NextResponse.json(
        {
          error: "Invio di prova già effettuato di recente, riprova più tardi",
          retryAt: new Date(last + TEST_COOLDOWN_MS).toISOString(),
        },
        { status: 429 }
      );
    }

    try {
      await sendWeeklyReport(session.user.id, settings.reportRecipients);
    } catch (err) {
      // Give the slot back if nothing was sent.
      await EmailReportSettings.updateOne(
        { userId: session.user.id },
        { reportLastTestAt: claimed.reportLastTestAt ?? null }
      );
      throw err;
    }

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

  let sent = 0;
  let errors = 0;

  for (const s of allSettings) {
    const shouldSend = force || shouldSendNow(s, now, todayDow);
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
  s: { reportDayOfWeek: number; reportLastSentAt: Date | null },
  now: Date,
  todayDow: number
): boolean {
  const last = s.reportLastSentAt ? new Date(s.reportLastSentAt) : null;

  // Avoid double-sending on the same calendar day
  if (last && last.toISOString().split("T")[0] === now.toISOString().split("T")[0]) {
    return false;
  }

  // Weekly only; legacy daily/monthly docs are treated as weekly.
  return todayDow === s.reportDayOfWeek;
}
