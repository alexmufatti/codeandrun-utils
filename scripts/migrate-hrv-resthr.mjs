/**
 * Migra HRV e Rest HR dal db strava (vecchio) a codeandrun-utils (nuovo).
 *
 * Uso:
 *   node scripts/migrate-hrv-resthr.mjs
 */

import { MongoClient } from "mongodb";
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

    // Costruisci mappa athleteId -> userId dalle StravaConnection
    const connections = await appsDb
      .collection("stravaconnections")
      .find({})
      .toArray();

    if (connections.length === 0) {
      console.error("Nessuna StravaConnection trovata in codeandrun-utils");
      process.exit(1);
    }

    const athleteToUser = new Map(
      connections.map((c) => [String(c.athleteId), String(c.userId)])
    );
    console.log(`StravaConnections trovate: ${connections.length}`);
    for (const [aid, uid] of athleteToUser) {
      console.log(`  athleteId ${aid} -> userId ${uid}`);
    }

    // Migra HRV
    console.log("\n--- HRV ---");
    const hrvDocs = await stravaDb.collection("hrv").find({}).toArray();
    console.log(`Documenti HRV nel vecchio db: ${hrvDocs.length}`);

    let hrvAdd = 0, hrvSkip = 0, hrvNoUser = 0;
    for (const doc of hrvDocs) {
      const userId = athleteToUser.get(String(doc.athleteId));
      if (!userId) {
        hrvNoUser++;
        continue;
      }
      const { _id, athleteId, ...rest } = doc;
      try {
        await appsDb.collection("hrventries").updateOne(
          { userId, calendarDate: rest.calendarDate },
          { $setOnInsert: { userId, ...rest } },
          { upsert: true }
        );
        hrvAdd++;
      } catch (e) {
        if (e.code === 11000) {
          hrvSkip++;
        } else {
          throw e;
        }
      }
    }
    console.log(`✓ HRV: ${hrvAdd} migrati, ${hrvSkip} già presenti, ${hrvNoUser} senza userId`);

    // Migra RestHR
    console.log("\n--- Rest HR ---");
    const resthrDocs = await stravaDb.collection("resthr").find({}).toArray();
    console.log(`Documenti RestHR nel vecchio db: ${resthrDocs.length}`);

    let restAdd = 0, restSkip = 0, restNoUser = 0;
    for (const doc of resthrDocs) {
      const userId = athleteToUser.get(String(doc.athleteId));
      if (!userId) {
        restNoUser++;
        continue;
      }
      const { _id, athleteId, ...rest } = doc;
      try {
        await appsDb.collection("resthrentries").updateOne(
          { userId, calendarDate: rest.calendarDate },
          { $setOnInsert: { userId, ...rest } },
          { upsert: true }
        );
        restAdd++;
      } catch (e) {
        if (e.code === 11000) {
          restSkip++;
        } else {
          throw e;
        }
      }
    }
    console.log(`✓ RestHR: ${restAdd} migrati, ${restSkip} già presenti, ${restNoUser} senza userId`);

  } finally {
    await Promise.all([appsClient.close(), stravaClient.close()]);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
