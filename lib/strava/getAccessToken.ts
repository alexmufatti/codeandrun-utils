import connectDB from "@/lib/mongodb";
import StravaConnection from "@/models/StravaConnection";

export async function getStravaAccessToken(userId: string): Promise<string> {
  await connectDB();
  const conn = await StravaConnection.findOne({ userId });
  if (!conn) throw new Error(`No Strava connection for user ${userId}`);

  // Refresh if expiring within 60 seconds
  if (conn.expiresAt - 60 < Math.floor(Date.now() / 1000)) {
    const res = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: conn.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) throw new Error("Failed to refresh Strava token");
    const data = await res.json();
    conn.accessToken = data.access_token;
    conn.refreshToken = data.refresh_token;
    conn.expiresAt = data.expires_at;
    await conn.save();
  }

  return conn.accessToken;
}
