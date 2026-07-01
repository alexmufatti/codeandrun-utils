#!/usr/bin/env node
/**
 * Converte le immagini esistenti su S3 in WebP ottimizzate,
 * sposta gli originali in uploads-originals/ e aggiorna i MDX.
 *
 * Uso:
 *   node scripts/migrate-images-to-webp.mjs [--dry-run]
 *
 * Con --dry-run mostra cosa farebbe senza modificare nulla.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

// ── Config ──────────────────────────────────────────────────────────────────
const BUCKET = "codeandrun-wordpress";
const REGION = "eu-south-1";
const AWS_PROFILE = "codeandrun";
const POSTS_DIR = "/Users/mua/Projects/codeandrun/codeandrun_astro/src/content/posts";
const IMAGE_RE = /\/uploads\/[^\s"'<>]+\.(jpg|jpeg|png)/gi;
const DRY_RUN = process.argv.includes("--dry-run");
// ────────────────────────────────────────────────────────────────────────────

if (DRY_RUN) console.log("🔍 DRY RUN — nessuna modifica verrà applicata\n");

// Usa le credenziali del profilo AWS tramite variabile d'ambiente
process.env.AWS_PROFILE = AWS_PROFILE;
const s3 = new S3Client({ region: REGION });

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function webpExistsOnS3(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function processImage(s3Key) {
  const original = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }));
  const buf = await streamToBuffer(original.Body);
  return sharp(buf)
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}

async function moveToArchive(s3Key) {
  // uploads/2026/06/img.jpg → uploads-originals/2026/06/img.jpg
  const archiveKey = s3Key.replace(/^uploads\//, "uploads-originals/");
  await s3.send(new CopyObjectCommand({
    Bucket: BUCKET,
    CopySource: `${BUCKET}/${s3Key}`,
    Key: archiveKey,
  }));
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key }));
}

// Raccoglie tutti i path immagine unici da tutti i file MDX
async function collectImagePaths() {
  const files = await readdir(POSTS_DIR);
  const mdxFiles = files.filter((f) => f.endsWith(".mdx"));

  const pathsToFiles = new Map(); // imagePath → Set<filePath> (case-preserving, deduplica per lowercase)
  const canonicalCase = new Map(); // lowercase → original case

  for (const name of mdxFiles) {
    const filePath = join(POSTS_DIR, name);
    const content = await readFile(filePath, "utf-8");
    const matches = content.match(IMAGE_RE) ?? [];
    for (const m of matches) {
      const key = m.toLowerCase();
      if (!canonicalCase.has(key)) canonicalCase.set(key, m);
      if (!pathsToFiles.has(key)) pathsToFiles.set(key, new Set());
      pathsToFiles.get(key).add(filePath);
    }
  }

  // Ricostruisce la mappa usando il case originale come chiave
  const result = new Map();
  for (const [lower, files] of pathsToFiles) {
    result.set(canonicalCase.get(lower), files);
  }
  return result;

  return result;
}

async function main() {
  console.log("📂 Scansiono i file MDX...");
  const pathsToFiles = await collectImagePaths();
  console.log(`   Trovati ${pathsToFiles.size} path immagine unici\n`);

  let converted = 0;
  let skipped = 0;
  let failed = 0;
  const replacements = new Map(); // oldPath → newPath

  for (const [imgPath, mdxFiles] of pathsToFiles) {
    const s3Key = imgPath.startsWith("/") ? imgPath.slice(1) : imgPath;
    const webpKey = s3Key.replace(/\.(jpg|jpeg|png)$/i, ".webp");
    const webpPath = `/${webpKey}`;

    if (imgPath === webpPath) {
      skipped++;
      continue;
    }

    // Già convertita?
    const exists = await webpExistsOnS3(webpKey);
    if (exists) {
      console.log(`⏭  già presente: ${webpKey}`);
      replacements.set(imgPath, webpPath);
      skipped++;
      continue;
    }

    try {
      if (!DRY_RUN) {
        const webpBuf = await processImage(s3Key);
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: webpKey,
          Body: webpBuf,
          ContentType: "image/webp",
        }));
        await moveToArchive(s3Key);
      }
      console.log(`✅ ${DRY_RUN ? "[dry] " : ""}convertita: ${s3Key} → ${webpKey}, originale → uploads-originals/ (${mdxFiles.size} post)`);
      replacements.set(imgPath, webpPath);
      converted++;
    } catch (err) {
      console.error(`❌ errore su ${s3Key}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📝 Aggiorno i file MDX (${replacements.size} sostituzioni)...`);

  const allMdx = (await readdir(POSTS_DIR)).filter((f) => f.endsWith(".mdx"));
  let filesUpdated = 0;

  for (const name of allMdx) {
    const filePath = join(POSTS_DIR, name);
    let content = await readFile(filePath, "utf-8");
    let changed = false;

    for (const [oldPath, newPath] of replacements) {
      // Case-insensitive replace preservando il case originale nel file
      const re = new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      if (re.test(content)) {
        content = content.replace(re, newPath);
        changed = true;
      }
    }

    if (changed) {
      if (!DRY_RUN) await writeFile(filePath, content, "utf-8");
      filesUpdated++;
    }
  }

  console.log(`\n🏁 Fatto!`);
  console.log(`   Convertite in WebP:       ${converted}`);
  console.log(`   Originali → uploads-originals/: ${converted}`);
  console.log(`   Già presenti (skip):      ${skipped}`);
  console.log(`   Errori:                   ${failed}`);
  console.log(`   File MDX aggiornati:      ${filesUpdated}`);
  if (DRY_RUN) console.log("\n⚠️  Esegui senza --dry-run per applicare le modifiche.");
}

main().catch((e) => { console.error(e); process.exit(1); });
