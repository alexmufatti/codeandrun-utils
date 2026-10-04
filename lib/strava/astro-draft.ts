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

// Campi interni/rumorosi da non includere nel commento dati.
const DATA_COMMENT_EXCLUDE = new Set(["_id", "userId", "athleteId", "embed_token", "astroSlug", "astroPostUrl"]);

function activityDataForComment(activity: any): Record<string, unknown> {
  const raw = typeof activity.toObject === "function" ? activity.toObject() : activity;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (DATA_COMMENT_EXCLUDE.has(k) || v === null || v === undefined) continue;
    if (k === "map" && v && typeof v === "object") {
      // le polyline sono enormi e inutili per scrivere l'articolo
      const { id, summary_polyline, polyline, resource_state, ...rest } = v as Record<string, unknown>;
      void id; void summary_polyline; void polyline; void resource_state;
      if (Object.keys(rest).length) out[k] = rest;
      continue;
    }
    out[k] = v;
  }
  return out;
}

// Commento MDX con tutti i dati Strava delle attività incluse (non renderizzato).
function buildDataComment(sorted: any[]): string {
  const json = JSON.stringify(sorted.map(activityDataForComment), null, 2)
    // "*/" chiuderebbe il commento
    .replace(/\*\//g, "*\\/");
  return `{/*\nDATI ATTIVITÀ (Strava)\n\n${json}\n*/}`;
}

export interface AstroDraftActivity {
  id: number;
  name: string;
  trainingType: string;
  trainingFeeling: string;
}

export interface AstroDraft {
  slug: string;
  filename: string;
  frontmatter: {
    title: string;
    date: string;
    excerpt: string;
    seoDescription: string;
    categories: string[];
    tags: string[];
    featuredImage: string;
    car_week: string;
    car_km: string;
  };
  activities: AstroDraftActivity[];
  body: string;
}

export async function generateAstroDraft(
  activities: any[],
  title: string
): Promise<AstroDraft> {
  const sorted = [...activities].sort((a, b) => a.id - b.id);
  const weeks = [...new Set(sorted.map((a) => isoWeek(a.start_date_local)))];

  const dateStr = sorted[sorted.length - 1].start_date_local.substring(0, 10);
  const slug = `${dateStr}-${toSlug(title)}`;

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

  const body = `import StravaAccordion from '../../components/shortcodes/StravaAccordion.astro';

<p></p>

## Uscite

${accordions}

${buildDataComment(sorted)}
`;

  return {
    slug,
    filename: `${slug}.mdx`,
    frontmatter: {
      title,
      date: dateStr,
      excerpt: "",
      seoDescription: "",
      categories: ["Running", "Sport"],
      tags: [],
      featuredImage: "",
      car_week: `W${weeks[0]}`,
      car_km: String(totalKm),
    },
    activities: sorted.map((a) => ({
      id: a.id,
      name: a.name,
      trainingType: trainingEmoji(a.name),
      trainingFeeling: "😐",
    })),
    body,
  };
}
