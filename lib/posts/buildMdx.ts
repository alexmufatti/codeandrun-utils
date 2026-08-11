export interface PostFields {
  title: string;
  date: string; // YYYY-MM-DD
  excerpt?: string;
  seoDescription?: string;
  categories?: string[];
  tags?: string[];
  featuredImage?: string;
  featuredImageAlt?: string;
  places?: string;
  body: string;
}

function yamlStr(val: string): string {
  return `"${val.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function yamlArray(arr: string[]): string {
  return `[${arr.map(yamlStr).join(", ")}]`;
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildFilename(date: string, slug: string): string {
  return `${date}-${slug}.mdx`;
}

export function buildMdx(fields: PostFields): string {
  const lines = ["---"];
  lines.push(`title: ${yamlStr(fields.title)}`);
  lines.push(`date: ${fields.date}`);
  if (fields.excerpt) lines.push(`excerpt: ${yamlStr(fields.excerpt)}`);
  if (fields.seoDescription) lines.push(`seoDescription: ${yamlStr(fields.seoDescription)}`);
  lines.push(`categories: ${yamlArray(fields.categories ?? [])}`);
  if (fields.tags?.length) lines.push(`tags: ${yamlArray(fields.tags)}`);
  if (fields.featuredImage) lines.push(`featuredImage: ${yamlStr(fields.featuredImage)}`);
  if (fields.featuredImageAlt) lines.push(`featuredImageAlt: ${yamlStr(fields.featuredImageAlt)}`);
  if (fields.places) lines.push(`places: ${yamlStr(fields.places)}`);
  lines.push("---");

  return `${lines.join("\n")}\n\n${fields.body.trim()}\n`;
}
