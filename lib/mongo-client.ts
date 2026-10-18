import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

export const AUTH_DB_NAME = "codeandrun-utils";

// Native client shared by the NextAuth adapter and the access-control helpers
// that read/write the adapter's `users` collection.
const client = new MongoClient(MONGODB_URI);
export const clientPromise = client.connect();
