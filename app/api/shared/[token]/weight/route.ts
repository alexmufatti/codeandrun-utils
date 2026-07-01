import { NextRequest, NextResponse } from "next/server";
import { validateSharedToken } from "@/lib/shared/validateToken";
import connectDB from "@/lib/mongodb";
import WeightEntry from "@/models/WeightEntry";

type Params = { params: Promise<{ token: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const shared = await validateSharedToken(token);
  if (!shared) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "30", 10);
  const validDays = [30, 90, 365].includes(days) ? days : 30;

  const since = new Date();
  since.setDate(since.getDate() - validDays);

  await connectDB();

  const entries = await WeightEntry.find({ userId: shared.userId, date: { $gte: since } })
    .sort({ date: 1 })
    .lean();

  return NextResponse.json(
    entries.map((e) => ({
      _id: e._id.toString(),
      date: (e.date as Date).toISOString().split("T")[0],
      weightKg: e.weightKg,
    }))
  );
}
