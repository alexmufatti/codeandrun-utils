/**
 * Migrazione attività da db `strava` (strava-markdown) a db `codeandrun` (apps).
 *
 * Prerequisito: l'utente deve aver già connesso Strava dalla UI (Fase 1),
 * così StravaConnection esiste e contiene la mappatura athleteId → userId.
 *
 * Uso:
 *   node scripts/migrate-strava-activities.mjs
 *
 * Variabili d'ambiente richieste (le stesse del progetto):
 *   MONGODB_URI      — URI del db codeandrun (es. mongodb+srv://...mongodb.net/codeandrun)
 *   STRAVA_MONGODB   — URI del db strava     (es. mongodb+srv://...mongodb.net/strava)
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
  console.error(
    "Mancano MONGODB_URI o STRAVA_MONGODB nel file .env.local"
  );
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

    // Debug: mostra le collection presenti nel db
    const collections = await appsDb.listCollections().toArray();
    console.log("Collection nel db codeandrun-utils:", collections.map((c) => c.name));

    // 1. Carica la mappatura athleteId → userId da StravaConnection
    const connections = await appsDb
      .collection("stravaconnections")
      .find({})
      .toArray();

    if (connections.length === 0) {
      console.error(
        "Nessuna StravaConnection trovata. Connetti prima Strava dalla UI."
      );
      process.exit(1);
    }

    const athleteToUser = new Map(
      connections.map((c) => [c.athleteId, { userId: c.userId, athleteId: c.athleteId }])
    );
    console.log(`Trovate ${connections.length} connessioni Strava:`);
    connections.forEach((c) =>
      console.log(`  athleteId=${c.athleteId} → userId=${c.userId} (${c.athleteFirstname} ${c.athleteLastname})`)
    );

    // 2. Leggi le attività dal db strava
    const total = await stravaDb.collection("activities").countDocuments();
    console.log(`\nAttività nel db strava: ${total}`);

    if (total === 0) {
      console.log("Nessuna attività da migrare.");
      return;
    }

    const targetCollection = appsDb.collection("stravaactivities");
    const cursor = stravaDb.collection("activities").find({});

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for await (const activity of cursor) {
      const athleteId = activity.athlete?.id;
      const mapping = athleteToUser.get(athleteId);

      if (!mapping) {
        skipped++;
        continue;
      }

      try {
        const { _id, ...activityData } = activity;
        await targetCollection.replaceOne(
          { id: activity.id, userId: mapping.userId },
          { ...activityData, userId: mapping.userId, athleteId: mapping.athleteId },
          { upsert: true }
        );
        migrated++;
        if (migrated % 100 === 0) {
          console.log(`  Migrated ${migrated}/${total}...`);
        }
      } catch (err) {
        console.error(`  Errore attività id=${activity.id}: ${err.message}`);
        errors++;
      }
    }

    console.log(`\n✓ Migrazione completata:`);
    console.log(`  Migrate:  ${migrated}`);
    console.log(`  Saltate (athleteId non in StravaConnection): ${skipped}`);
    console.log(`  Errori:   ${errors}`);
  } finally {
    await Promise.all([appsClient.close(), stravaClient.close()]);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
