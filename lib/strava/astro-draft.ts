import { uploadToS3 } from "@/lib/s3";

function trainingEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("z5") || n.includes("z4")) return "🔴";
  if (n.includes("z3")) return "🟡";
  return "🟢";
}

function isoWeek(dateStr: string): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - w1.getTime()) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}

function mondayOf(week: number, year: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday;
}

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function downloadMapBuffer(polyline: string): Promise<Buffer | null> {
  const key = process.env.G_STATICMAP_KEY;
  if (!key) return null;
  const url =
    `https://maps.googleapis.com/maps/api/staticmap?key=${key}` +
    `&size=800x600` +
    `&path=color:0x0000ff80|weight:3|enc:${encodeURIComponent(polyline)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}

export async function generateAstroDraft(
  activities: any[],
  title: string
): Promise<{ mdxContent: string; slug: string }> {
  const sorted = [...activities].sort((a, b) => a.id - b.id);
  const weeks = [...new Set(sorted.map((a) => isoWeek(a.start_date_local)))];
  const year = new Date(sorted[0].start_date_local).getFullYear();
  const monday = mondayOf(weeks[0], year);

  const dateStr = monday.toISOString().substring(0, 10);
  const slug = `${dateStr}-${toSlug(title)}`;

  const trainingTypes = JSON.stringify(sorted.map((a) => trainingEmoji(a.name)));
  const trainingFeelings = JSON.stringify(sorted.map(() => "😐"));
  const totalKm = Math.round(sorted.reduce((sum, a) => sum + (a.distance ?? 0), 0) / 1000);

  // Download e upload mappe su S3
  const imageUrls = new Map<number, string>();
  for (const activity of sorted) {
    const polyline = activity.map?.summary_polyline;
    if (!polyline) continue;
    const actDate = activity.start_date_local.substring(0, 10);
    const [actY, actM] = actDate.split("-");
    const s3Key = `uploads/${actY}/${actM}/strava-${activity.id}-map.png`;
    const buf = await downloadMapBuffer(polyline);
    if (!buf) continue;
    try {
      await uploadToS3(s3Key, buf, "image/png");
      imageUrls.set(activity.id, `/${s3Key}`);
    } catch {
      // mappa non disponibile, continua senza
    }
  }

  // StravaAccordion per ogni attività
  const accordions = sorted
    .map((activity) => {
      const imageUrl = imageUrls.get(activity.id);
      const embedAttr = activity.embed_token ? ` embedId="${activity.embed_token}"` : "";
      const imageAttr = imageUrl ? ` imageUrl="${imageUrl}"` : "";
      return `<StravaAccordion id="${activity.id}"${embedAttr}${imageAttr} />`;
    })
    .join("\n\n");

  const mdxContent = `---
title: "${title}"
date: ${dateStr}
excerpt: ""
categories: ["Running", "Sport"]
car_week: "W${weeks[0]}"
car_km: "${totalKm}"
training_types: ${trainingTypes}
training_feelings: ${trainingFeelings}
---

import StravaAccordion from '../../components/shortcodes/StravaAccordion.astro';

<p></p>

## Uscite

${accordions}
`;

  return { mdxContent, slug };
}
