import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import UserSettings from "@/models/UserSettings";
import type { ZonePercent } from "@/types/hr";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const settings = await UserSettings.findOne({
    userId: session.user.id,
  }).lean();

  let hrZonePercents: ZonePercent[] | null = null;
  if (settings?.hrZonePercents) {
    try {
      hrZonePercents = JSON.parse(settings.hrZonePercents);
    } catch {
      hrZonePercents = null;
    }
  }

  return NextResponse.json({
    hrMaxBpm: settings?.hrMaxBpm ?? null,
    hrRestingBpm: settings?.hrRestingBpm ?? null,
    hrZoneMethod: settings?.hrZoneMethod ?? null,
    hrSource: settings?.hrSource ?? null,
    hrAge: settings?.hrAge ?? null,
    hrFormula: settings?.hrFormula ?? null,
    hrZonePercents,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { hrMaxBpm, hrRestingBpm, hrZoneMethod, hrSource, hrAge, hrFormula, hrZonePercents } = body;

  if (
    hrMaxBpm !== null &&
    (typeof hrMaxBpm !== "number" || hrMaxBpm <= 0 || hrMaxBpm > 250)
  ) {
    return NextResponse.json({ error: "Invalid hrMaxBpm" }, { status: 400 });
  }

  if (
    hrRestingBpm !== null &&
    (typeof hrRestingBpm !== "number" || hrRestingBpm <= 0 || hrRestingBpm > 200)
  ) {
    return NextResponse.json({ error: "Invalid hrRestingBpm" }, { status: 400 });
  }

  if (
    hrZoneMethod !== null &&
    hrZoneMethod !== "max" &&
    hrZoneMethod !== "karvonen"
  ) {
    return NextResponse.json({ error: "Invalid hrZoneMethod" }, { status: 400 });
  }

  if (
    hrSource !== null &&
    hrSource !== "manual" &&
    hrSource !== "formula"
  ) {
    return NextResponse.json({ error: "Invalid hrSource" }, { status: 400 });
  }

  if (
    hrAge !== null &&
    (typeof hrAge !== "number" || hrAge < 10 || hrAge > 120)
  ) {
    return NextResponse.json({ error: "Invalid hrAge" }, { status: 400 });
  }

  if (
    hrFormula !== null &&
    !["fox", "tanaka", "gellish", "nes"].includes(hrFormula)
  ) {
    return NextResponse.json({ error: "Invalid hrFormula" }, { status: 400 });
  }

  let hrZonePercentsStr: string | null = null;
  if (hrZonePercents !== null && hrZonePercents !== undefined) {
    if (!Array.isArray(hrZonePercents) || hrZonePercents.length !== 5) {
      return NextResponse.json({ error: "Invalid hrZonePercents" }, { status: 400 });
    }
    hrZonePercentsStr = JSON.stringify(hrZonePercents);
  }

  await connectDB();

  await UserSettings.findOneAndUpdate(
    { userId: session.user.id },
    {
      userId: session.user.id,
      hrMaxBpm,
      hrRestingBpm,
      hrZoneMethod,
      hrSource,
      hrAge,
      hrFormula,
      hrZonePercents: hrZonePercentsStr,
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({
    hrMaxBpm,
    hrRestingBpm,
    hrZoneMethod,
    hrSource,
    hrAge,
    hrFormula,
    hrZonePercents,
  });
}
