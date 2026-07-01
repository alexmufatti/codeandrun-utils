import { NextResponse } from "next/server";
import { auth as getAuth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import { isWordPressUser } from "@/lib/wordpress-auth";
import { uploadToS3 } from "@/lib/s3";
import {
  getMonthlyStats,
  getKudosPerYear,
  getPersonalRecords,
  computeYearTotals,
  buildChartData,
} from "@/lib/strava/stats";

export async function POST() {
  const session = await getAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isWordPressUser(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const [monthlyData, kudosData, prData] = await Promise.all([
    getMonthlyStats(session.user.id),
    getKudosPerYear(session.user.id),
    getPersonalRecords(session.user.id),
  ]);

  const yearTotals = computeYearTotals(monthlyData, kudosData);
  const { header: chartHeader, rows: chartRows, years: chartYears } = buildChartData(monthlyData);

  const statsJson = JSON.stringify({
    updatedAt: new Date().toISOString(),
    yearTotals,
    chartHeader,
    chartRows,
    chartYears,
    personalRecords: prData,
  });

  const cdnUrl = await uploadToS3(
    "data/running-stats.json",
    statsJson,
    "application/json"
  );

  return NextResponse.json({ ok: true, cdnUrl });
}
