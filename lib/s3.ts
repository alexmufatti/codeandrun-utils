import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import sharp from "sharp";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: process.env.AWS_REGION ?? "eu-south-1",
      credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          }
        : undefined,
    });
  }
  return _client;
}

export async function uploadToS3(
  key: string,
  body: Buffer | string,
  contentType: string
): Promise<string> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET not configured");

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  const cdn = process.env.CDN_URL ?? "https://cdn.codeandrun.it";
  return `${cdn}/${key}`;
}

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "avif", "heic", "heif", "tiff"]);

export async function resizeAndUploadImage(
  file: File,
  folder: string
): Promise<{ key: string; url: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const slug = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const original = Buffer.from(await file.arrayBuffer());

  let buf: Buffer;
  let contentType: string;
  let finalExt: string;

  if (IMAGE_EXTS.has(ext)) {
    buf = await sharp(original)
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    contentType = "image/webp";
    finalExt = "webp";
  } else {
    buf = original;
    contentType = file.type || "application/octet-stream";
    finalExt = ext;
  }

  const key = `uploads/${folder}/${slug}.${finalExt}`;
  const url = await uploadToS3(key, buf, contentType);
  return { key, url };
}

export interface S3Image {
  key: string;
  url: string;
  size: number;
  lastModified: string;
}

export async function listImages(prefix = "uploads/", maxKeys = 300): Promise<S3Image[]> {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET not configured");
  const cdn = process.env.CDN_URL ?? "https://cdn.codeandrun.it";

  const images: S3Image[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await getClient().send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      })
    );

    for (const obj of res.Contents ?? []) {
      if (!obj.Key || obj.Key.endsWith("/") || !obj.LastModified) continue;
      images.push({
        key: obj.Key,
        url: `${cdn}/${obj.Key}`,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified.toISOString(),
      });
    }

    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken && images.length < maxKeys);

  return images
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified))
    .slice(0, maxKeys);
}
