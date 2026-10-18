import { ObjectId } from "mongodb";
import connectDB from "@/lib/mongodb";
import { clientPromise, AUTH_DB_NAME } from "@/lib/mongo-client";
import { getStravaAccessToken } from "@/lib/strava/getAccessToken";
import EmailReportSettings from "@/models/EmailReportSettings";
import Habit from "@/models/Habit";
import HabitCheckin from "@/models/HabitCheckin";
import HrvEntry from "@/models/HrvEntry";
import PersonalRecord from "@/models/PersonalRecord";
import RestHrEntry from "@/models/RestHrEntry";
import SleepEntry from "@/models/SleepEntry";
import StravaActivity from "@/models/StravaActivity";
import StravaConnection from "@/models/StravaConnection";
import StravaEvent from "@/models/StravaEvent";
import StravaUpdate from "@/models/StravaUpdate";
import UserSettings from "@/models/UserSettings";
import WeightEntry from "@/models/WeightEntry";

const WITHOUT_USER_ID = { userId: 0 } as const;

// Everything stored for one user, as a single JSON-serializable object.
// Strava OAuth tokens are left out on purpose.
export async function exportUserData(userId: string) {
  await connectDB();

  const [
    weight,
    settings,
    habits,
    habitCheckins,
    events,
    personalRecords,
    emailReportSettings,
    hrv,
    restHr,
    sleep,
    stravaActivities,
    stravaConnection,
  ] = await Promise.all([
    WeightEntry.find({ userId }, WITHOUT_USER_ID).sort({ date: 1 }).lean(),
    UserSettings.findOne({ userId }, WITHOUT_USER_ID).lean(),
    Habit.find({ userId }, WITHOUT_USER_ID).sort({ order: 1 }).lean(),
    HabitCheckin.find({ userId }, WITHOUT_USER_ID).sort({ date: 1 }).lean(),
    StravaEvent.find({ userId }, WITHOUT_USER_ID).lean(),
    PersonalRecord.find({ userId }, WITHOUT_USER_ID).lean(),
    EmailReportSettings.findOne({ userId }, WITHOUT_USER_ID).lean(),
    HrvEntry.find({ userId }, WITHOUT_USER_ID).sort({ calendarDate: 1 }).lean(),
    RestHrEntry.find({ userId }, WITHOUT_USER_ID).sort({ calendarDate: 1 }).lean(),
    SleepEntry.find({ userId }, WITHOUT_USER_ID).sort({ calendarDate: 1 }).lean(),
    StravaActivity.find({ userId }, WITHOUT_USER_ID).sort({ start_date: 1 }).lean(),
    StravaConnection.findOne(
      { userId },
      { userId: 0, accessToken: 0, refreshToken: 0, expiresAt: 0 }
    ).lean(),
  ]);

  const account = ObjectId.isValid(userId)
    ? await (await clientPromise)
        .db(AUTH_DB_NAME)
        .collection("users")
        .findOne(
          { _id: new ObjectId(userId) },
          { projection: { _id: 0, name: 1, email: 1, accessStatus: 1, privacyConsent: 1 } }
        )
    : null;

  return {
    exportedAt: new Date().toISOString(),
    account,
    weight,
    settings,
    habits,
    habitCheckins,
    events,
    personalRecords,
    emailReportSettings,
    hrv,
    restHr,
    sleep,
    stravaConnection,
    stravaActivities,
  };
}

// Best effort: a failed revoke must not block the deletion of the local data.
async function deauthorizeStrava(userId: string): Promise<void> {
  try {
    const accessToken = await getStravaAccessToken(userId);
    const res = await fetch("https://www.strava.com/oauth/deauthorize", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      console.error(`Strava deauthorize failed for userId=${userId}: ${res.status}`);
    }
  } catch (err) {
    console.error(`Strava deauthorize failed for userId=${userId}:`, err);
  }
}

// Removes every document owned by the user, revokes the Strava authorization
// and deletes the NextAuth user + linked accounts. Irreversible.
export async function deleteUserAccount(userId: string): Promise<void> {
  await connectDB();

  const connection = await StravaConnection.findOne({ userId }).lean();
  if (connection) {
    await deauthorizeStrava(userId);
  }

  await Promise.all([
    WeightEntry.deleteMany({ userId }),
    UserSettings.deleteMany({ userId }),
    Habit.deleteMany({ userId }),
    HabitCheckin.deleteMany({ userId }),
    StravaEvent.deleteMany({ userId }),
    PersonalRecord.deleteMany({ userId }),
    EmailReportSettings.deleteMany({ userId }),
    HrvEntry.deleteMany({ userId }),
    RestHrEntry.deleteMany({ userId }),
    SleepEntry.deleteMany({ userId }),
    StravaActivity.deleteMany({ userId }),
    StravaConnection.deleteMany({ userId }),
    ...(connection ? [StravaUpdate.deleteMany({ owner_id: connection.athleteId })] : []),
  ]);

  if (!ObjectId.isValid(userId)) return;
  const db = (await clientPromise).db(AUTH_DB_NAME);
  const _id = new ObjectId(userId);
  await db.collection("accounts").deleteMany({ userId: _id });
  await db.collection("users").deleteOne({ _id });
}
