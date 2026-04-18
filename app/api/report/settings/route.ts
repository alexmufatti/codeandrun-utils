import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import EmailReportSettings from "@/models/EmailReportSettings";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const settings = await EmailReportSettings.findOne({
    userId: session.user.id,
  }).lean();

  return NextResponse.json({
    reportEnabled: settings?.reportEnabled ?? false,
    reportRecipients: settings?.reportRecipients ?? [],
    reportFrequency: settings?.reportFrequency ?? "weekly",
    reportDayOfWeek: settings?.reportDayOfWeek ?? 1,
    reportLastSentAt: settings?.reportLastSentAt ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { reportEnabled, reportRecipients, reportFrequency, reportDayOfWeek } = body;

  if (
    typeof reportEnabled !== "boolean" ||
    !Array.isArray(reportRecipients) ||
    !["daily", "weekly", "monthly"].includes(reportFrequency) ||
    typeof reportDayOfWeek !== "number" ||
    reportDayOfWeek < 0 ||
    reportDayOfWeek > 6
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Validate email addresses
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const r of reportRecipients) {
    if (typeof r !== "string" || !emailRegex.test(r)) {
      return NextResponse.json(
        { error: `Invalid email address: ${r}` },
        { status: 400 }
      );
    }
  }

  await connectDB();

  const settings = await EmailReportSettings.findOneAndUpdate(
    { userId: session.user.id },
    {
      userId: session.user.id,
      reportEnabled,
      reportRecipients,
      reportFrequency,
      reportDayOfWeek,
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({
    reportEnabled: settings!.reportEnabled,
    reportRecipients: settings!.reportRecipients,
    reportFrequency: settings!.reportFrequency,
    reportDayOfWeek: settings!.reportDayOfWeek,
    reportLastSentAt: settings!.reportLastSentAt,
  });
}
