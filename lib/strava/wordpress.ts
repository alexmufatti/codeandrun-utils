const TITLES = [
  "Prima uscita",
  "Seconda uscita",
  "Terza uscita",
  "Quarta uscita",
  "Quinta uscita",
  "Sesta uscita",
  "Settima uscita",
];

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

function mondayOf(week: number, year: number): string {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  return monday.toISOString().replace("T", " ").substring(0, 19);
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

async function uploadMapToWordPress(
  buffer: Buffer,
  filename: string,
  auth: string,
  wpUrl: string
): Promise<{ id: number; url: string } | null> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)], { type: "image/png" }), filename);

  const res = await fetch(`${wpUrl}/wp-json/wp/v2/media`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}` },
    body: form,
  });
  if (!res.ok) return null;
  const data = await res.json();
  return { id: data.id, url: data.source_url };
}

async function getOrCreateCategory(
  name: string,
  auth: string,
  wpUrl: string
): Promise<number> {
  const res = await fetch(`${wpUrl}/wp-json/wp/v2/categories?per_page=100`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const cats = await res.json();
  const existing = cats.find(
    (c: any) => c.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) return existing.id;

  const create = await fetch(`${wpUrl}/wp-json/wp/v2/categories`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });
  const created = await create.json();
  return created.id;
}

export async function createWordPressDraft(
  activities: any[],
  title: string
): Promise<{ postId: number; postUrl: string }> {
  const wpUrl = process.env.WP_SITE_URL!;
  const auth = Buffer.from(
    `${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`
  ).toString("base64");

  const sorted = [...activities].sort((a, b) => a.id - b.id);
  const weeks = [...new Set(sorted.map((a) => isoWeek(a.start_date_local)))];
  const year = new Date(sorted[0].start_date_local).getFullYear();

  // Download e upload mappe
  const mediaMap = new Map<number, { id: number; url: string }>();
  for (const activity of sorted) {
    const polyline = activity.map?.summary_polyline;
    if (!polyline) continue;
    const date = activity.start_date_local.substring(0, 10).replace(/-/g, "");
    const filename = `${date}-activity-map.png`;
    const buf = await downloadMapBuffer(polyline);
    if (!buf) continue;
    const media = await uploadMapToWordPress(buf, filename, auth, wpUrl);
    if (media) mediaMap.set(activity.id, media);
  }

  // Costruisci contenuto Gutenberg
  let content = "";
  for (let i = 0; i < sorted.length; i++) {
    const activity = sorted[i];
    const heading = TITLES[i] ?? "Altra uscita";
    content += `<!-- wp:heading -->\n<h2 class="wp-block-heading">${heading}</h2>\n<!-- /wp:heading -->\n\n`;

    const media = mediaMap.get(activity.id);
    if (media) {
      content +=
        `<!-- wp:image {"id":${media.id},"sizeSlug":"large","linkDestination":"none"} -->\n` +
        `<figure class="wp-block-image size-large"><img src="${media.url}" alt="map" class="wp-image-${media.id}"/></figure>\n` +
        `<!-- /wp:image -->\n\n`;
    }

    content +=
      `<!-- wp:shortcode -->\n` +
      `[strava id="${activity.id}" embed_id="${activity.embed_token}"]\n` +
      `<!-- /wp:shortcode -->\n\n`;
  }

  // Categorie
  const [sportId, runningId] = await Promise.all([
    getOrCreateCategory("Sport", auth, wpUrl),
    getOrCreateCategory("Running", auth, wpUrl),
  ]);

  // Metadati training
  const trainingTypes = sorted.map((a) => trainingEmoji(a.name)).join(",");
  const trainingFeelings = sorted.map(() => "😭").join(",");

  const postDate = mondayOf(weeks[0], year);

  const res = await fetch(`${wpUrl}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      content,
      status: "draft",
      date: postDate,
      categories: [sportId, runningId],
      meta: { training_types: trainingTypes, training_feelings: trainingFeelings },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WordPress API error: ${err}`);
  }

  const post = await res.json();
  return { postId: post.id, postUrl: post.link };
}
