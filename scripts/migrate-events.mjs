/**
 * Migra gli eventi dal db strava (vecchio) a codeandrun-utils (nuovo).
 *
 * Uso:
 *   node scripts/migrate-events.mjs
 */

import { MongoClient, ObjectId } from "mongodb";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const CODEANDRUN_URI = process.env.MONGODB_URI;
const STRAVA_URI = process.env.STRAVA_MONGODB;

if (!CODEANDRUN_URI || !STRAVA_URI) {
  console.error("Mancano MONGODB_URI o STRAVA_MONGODB nel file .env.local");
  process.exit(1);
}

async function main() {
  const [appsClient, stravaClient] = await Promise.all([
    MongoClient.connect(CODEANDRUN_URI),
    MongoClient.connect(STRAVA_URI),
  ]);

  try {
    const appsDb = appsClient.db("codeandrun-utils");
    const stravaDb = stravaClient.db("strava");

    const connections = await appsDb
      .collection("stravaconnections")
      .find({})
      .toArray();

    if (connections.length === 0) {
      console.error("Nessuna StravaConnection trovata");
      process.exit(1);
    }

    const athleteToUser = new Map(
      connections.map((c) => [String(c.athleteId), String(c.userId)])
    );

    const eventDocs = await stravaDb.collection("events").find({}).toArray();
    console.log(`Eventi trovati nel vecchio db: ${eventDocs.length}`);

    let add = 0, noUser = 0;
    for (const doc of eventDocs) {
      const userId = athleteToUser.get(String(doc.athleteId));
      if (!userId) {
        noUser++;
        continue;
      }
      await appsDb.collection("stravaevents").insertOne({
        _id: new ObjectId(),
        userId,
        description: doc.description ?? "",
        start_date: doc.start_date,
        end_date: doc.end_date,
        type: doc.type ?? "",
      });
      add++;
    }

    console.log(`✓ ${add} eventi migrati, ${noUser} senza userId`);
  } finally {
    await Promise.all([appsClient.close(), stravaClient.close()]);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
