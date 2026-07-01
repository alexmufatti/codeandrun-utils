import { NextRequest, NextResponse } from "next/server";
import { validateSharedToken } from "@/lib/shared/validateToken";
import connectDB from "@/lib/mongodb";
import UserSettings from "@/models/UserSettings";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params;
  const shared = await validateSharedToken(token);
  if (!shared) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await connectDB();

  const settings = await UserSettings.findOne({ userId: shared.userId }).lean();
  return NextResponse.json({ targetWeightKg: (settings as any)?.targetWeightKg ?? null });
}
