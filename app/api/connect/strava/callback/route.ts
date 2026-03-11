import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import StravaConnection from "@/models/StravaConnection";

const BASE_URL = process.env.NEXTAUTH_URL!;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", BASE_URL));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/dashboard/strava?error=access_denied", BASE_URL)
    );
  }

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL("/dashboard/strava?error=token_exchange", BASE_URL)
    );
  }

  const data = await tokenRes.json();

  await connectDB();
  await StravaConnection.findOneAndUpdate(
    { userId: session.user.id },
    {
      userId: session.user.id,
      athleteId: data.athlete.id,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      athleteFirstname: data.athlete.firstname ?? "",
      athleteLastname: data.athlete.lastname ?? "",
    },
    { upsert: true, new: true }
  );

  return NextResponse.redirect(new URL("/dashboard/strava", BASE_URL));
}
