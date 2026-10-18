import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import StravaConnection from "@/models/StravaConnection";
import { STRAVA_REQUIRED_SCOPE, STRAVA_STATE_COOKIE } from "@/lib/strava/oauth";

const BASE_URL = process.env.NEXTAUTH_URL!;

function sameState(expected: string | undefined, received: string | null): boolean {
  if (!expected || !received || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

// Redirects back to settings, always dropping the one-shot state cookie.
function backToSettings(error?: string): NextResponse {
  const url = new URL("/dashboard/settings", BASE_URL);
  if (error) url.searchParams.set("error", error);
  const res = NextResponse.redirect(url);
  res.cookies.delete({ name: STRAVA_STATE_COOKIE, path: "/api/connect/strava" });
  return res;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", BASE_URL));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (!sameState(req.cookies.get(STRAVA_STATE_COOKIE)?.value, searchParams.get("state"))) {
    return backToSettings("invalid_state");
  }

  if (error || !code) {
    return backToSettings("access_denied");
  }

  const grantedScopes = (searchParams.get("scope") ?? "").split(",");
  if (!grantedScopes.includes(STRAVA_REQUIRED_SCOPE)) {
    return backToSettings("missing_scope");
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
    return backToSettings("token_exchange");
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

  return backToSettings();
}
