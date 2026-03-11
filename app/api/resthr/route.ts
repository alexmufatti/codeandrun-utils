import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import RestHrEntry from "@/models/RestHrEntry";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? "2000-01-01";

  await connectDB();

  const data = await RestHrEntry.find({
    userId: session.user.id,
    calendarDate: { $gte: from },
  })
    .sort({ calendarDate: 1 })
    .select({ calendarDate: 1, values: 1, _id: 0 })
    .lean();

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Expected array" }, { status: 400 });
  }

  await connectDB();

  let add = 0;
  let duplicate = 0;
  for (const item of body) {
    if (!item.calendarDate) continue;
    try {
      await RestHrEntry.create({ userId: session.user.id, ...item });
      add++;
    } catch (e: any) {
      if (e.code === 11000) {
        duplicate++;
      } else {
        throw e;
      }
    }
  }

  return NextResponse.json({ add, duplicate });
}
