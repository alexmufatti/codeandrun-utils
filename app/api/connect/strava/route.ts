import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { STRAVA_SCOPES, STRAVA_STATE_COOKIE } from "@/lib/strava/oauth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", process.env.NEXTAUTH_URL!));
  }

  const state = randomBytes(32).toString("hex");

  const stravaUrl = new URL("https://www.strava.com/oauth/authorize");
  stravaUrl.searchParams.set("client_id", process.env.STRAVA_CLIENT_ID!);
  stravaUrl.searchParams.set("response_type", "code");
  stravaUrl.searchParams.set(
    "redirect_uri",
    `${process.env.NEXTAUTH_URL}/api/connect/strava/callback`
  );
  stravaUrl.searchParams.set("approval_prompt", "auto");
  stravaUrl.searchParams.set("scope", STRAVA_SCOPES);
  stravaUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(stravaUrl.toString());
  res.cookies.set(STRAVA_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/connect/strava",
    maxAge: 600,
  });
  return res;
}
