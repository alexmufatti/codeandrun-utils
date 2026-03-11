import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", process.env.NEXTAUTH_URL!));
  }

  const stravaUrl = new URL("https://www.strava.com/oauth/authorize");
  stravaUrl.searchParams.set("client_id", process.env.STRAVA_CLIENT_ID!);
  stravaUrl.searchParams.set("response_type", "code");
  stravaUrl.searchParams.set(
    "redirect_uri",
    `${process.env.NEXTAUTH_URL}/api/connect/strava/callback`
  );
  stravaUrl.searchParams.set("approval_prompt", "auto");
  stravaUrl.searchParams.set("scope", "read,activity:read_all");

  return NextResponse.redirect(stravaUrl.toString());
}
