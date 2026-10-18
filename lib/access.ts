import { ObjectId } from "mongodb";
import { clientPromise, AUTH_DB_NAME } from "@/lib/mongo-client";

// Signing in with Google is the access request: a new user starts as "pending"
// (no `accessStatus` field on the adapter's user doc) until the admin approves.
export type AccessStatus = "pending" | "approved" | "rejected";

export const ACCESS_STATUSES: AccessStatus[] = ["pending", "approved", "rejected"];

export type AccessUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  accessStatus: AccessStatus;
  requestedAt: string;
};

async function usersCollection() {
  const client = await clientPromise;
  return client.db(AUTH_DB_NAME).collection("users");
}

function normalizeStatus(value: unknown): AccessStatus {
  return value === "approved" || value === "rejected" ? value : "pending";
}

export type AccessState = {
  accessStatus: AccessStatus;
  // Version of the privacy policy the user accepted, null if never accepted.
  consentVersion: string | null;
};

export async function getAccessState(userId: string): Promise<AccessState> {
  if (!ObjectId.isValid(userId)) return { accessStatus: "pending", consentVersion: null };
  const users = await usersCollection();
  const user = await users.findOne(
    { _id: new ObjectId(userId) },
    { projection: { accessStatus: 1, privacyConsent: 1 } }
  );
  return {
    accessStatus: normalizeStatus(user?.accessStatus),
    consentVersion: user?.privacyConsent?.version ?? null,
  };
}

export async function recordPrivacyConsent(userId: string, version: string): Promise<boolean> {
  if (!ObjectId.isValid(userId)) return false;
  const users = await usersCollection();
  const result = await users.updateOne(
    { _id: new ObjectId(userId) },
    { $set: { privacyConsent: { version, acceptedAt: new Date() } } }
  );
  return result.matchedCount === 1;
}

export async function listAccessUsers(): Promise<AccessUser[]> {
  const users = await usersCollection();
  const docs = await users
    .find({}, { projection: { name: 1, email: 1, image: 1, accessStatus: 1 } })
    .sort({ _id: -1 })
    .toArray();
  return docs.map((u) => ({
    id: u._id.toString(),
    name: u.name ?? null,
    email: u.email ?? null,
    image: u.image ?? null,
    accessStatus: normalizeStatus(u.accessStatus),
    requestedAt: u._id.getTimestamp().toISOString(),
  }));
}

export async function setAccessStatus(
  userId: string,
  status: AccessStatus
): Promise<boolean> {
  if (!ObjectId.isValid(userId)) return false;
  const users = await usersCollection();
  const result = await users.updateOne(
    { _id: new ObjectId(userId) },
    { $set: { accessStatus: status, accessUpdatedAt: new Date() } }
  );
  return result.matchedCount === 1;
}
