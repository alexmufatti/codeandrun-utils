import { NextRequest, NextResponse } from "next/server";
import { validateSharedToken } from "@/lib/shared/validateToken";
import connectDB from "@/lib/mongodb";
import RestHrEntry from "@/models/RestHrEntry";

type Params = { params: Promise<{ token: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { token } = await params;
  const shared = await validateSharedToken(token);
  if (!shared) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? "2000-01-01";

  await connectDB();

  const data = await RestHrEntry.find({ userId: shared.userId, calendarDate: { $gte: from } })
    .sort({ calendarDate: 1 })
    .select({ calendarDate: 1, values: 1, _id: 0 })
    .lean();

  return NextResponse.json(data);
}
