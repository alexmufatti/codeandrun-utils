/**
 * Migra lo stato "pubblicato" dalla collection `items` del db strava
 * alla collection `stravaactivities` del db codeandrun-utils.
 *
 * Nel vecchio db, `items` traccia le attività già processate (ZIP o WP draft).
 * Le attività con `path != ''` sono state esportate via ZIP.
 * Le attività con `path == ''` sono state bloccate/processate via WP.
 * In entrambi i casi le marchiamo come `legacyPublished: true` nel nuovo db.
 *
 * Uso:
 *   node scripts/migrate-strava-published.mjs
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

    // Leggi tutti gli items dal vecchio db
    const items = await stravaDb.collection("items").find({}).toArray();
    console.log(`Items trovati nel vecchio db: ${items.length}`);

    if (items.length === 0) {
      console.log("Nessun item da migrare.");
      return;
    }

    // Raggruppa per tipo (ZIP vs WP/block)
    const zipped = items.filter((i) => i.path && i.path !== "");
    const blocked = items.filter((i) => !i.path || i.path === "");
    console.log(`  Con path (ZIP): ${zipped.length}`);
    console.log(`  Senza path (WP/block): ${blocked.length}`);

    // Aggiorna stravaactivities impostando legacyPublished: true
    const ids = items.map((i) => i.id);
    const result = await appsDb
      .collection("stravaactivities")
      .updateMany(
        { id: { $in: ids } },
        { $set: { legacyPublished: true } }
      );

    console.log(`\n✓ Attività aggiornate: ${result.modifiedCount} / ${ids.length}`);

    const notFound = ids.length - result.modifiedCount;
    if (notFound > 0) {
      console.log(`  (${notFound} non trovate in stravaactivities — probabilmente non ancora migrate)`);
    }
  } finally {
    await Promise.all([appsClient.close(), stravaClient.close()]);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
