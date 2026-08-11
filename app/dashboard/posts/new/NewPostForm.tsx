"use client";

import { useState } from "react";
import { toast } from "sonner";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function csvToArray(s: string): string[] {
  return s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export default function NewPostForm() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [categories, setCategories] = useState("");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState("");
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ url: string; commitSha: string } | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(title);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    const folder = date.slice(0, 7).replace("-", "/");
    const paths: string[] = [];
    try {
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        form.append("folder", folder);
        const res = await fetch("/api/strava/activities/astro/upload-media", { method: "POST", body: form });
        const data = await res.json();
        if (data.path) paths.push(data.path);
      }
    } finally {
      setUploading(false);
    }
    if (!paths.length) return;
    setUploadedPaths((prev) => [...prev, ...paths]);
    const figures = paths
      .map((p) => `<figure class="wp-block-image size-large"><img src="${p}" alt="" /></figure>`)
      .join("\n\n");
    setBody((prev) => (prev ? `${prev}\n\n${figures}` : figures));
    e.target.value = "";
  };

  const handlePublish = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Titolo e corpo del post sono obbligatori");
      return;
    }
    setPublishing(true);
    setResult(null);
    try {
      const res = await fetch("/api/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          date,
          slug: effectiveSlug,
          excerpt: excerpt || undefined,
          categories: csvToArray(categories),
          tags: csvToArray(tags),
          featuredImage: featuredImage || undefined,
          body,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error === "already_exists" ? "Esiste già un post con questo slug/data" : "Pubblicazione fallita");
        return;
      }
      setResult({ url: data.url, commitSha: data.commitSha });
      toast.success("Post pubblicato!");
    } catch {
      toast.error("Pubblicazione fallita, riprova");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-lg font-semibold">Nuovo post</h1>

      {result && (
        <div className="rounded-md border border-border bg-muted/30 p-4 text-sm space-y-1">
          <p className="font-medium">Pubblicato ✓</p>
          <p>
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-[#FC4C02] hover:underline">
              {result.url}
            </a>
          </p>
          <p className="text-xs text-muted-foreground">commit {result.commitSha.slice(0, 7)}</p>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium">Titolo</label>
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Slug</label>
          <input
            type="text"
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground -mt-4">
        File: <code className="bg-muted px-1 rounded">{date}-{effectiveSlug}.mdx</code>
      </p>

      <div className="space-y-1">
        <label className="text-sm font-medium">Estratto</label>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Categorie</label>
          <input
            type="text"
            placeholder="Running, Sport"
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Tag</label>
          <input
            type="text"
            placeholder="trail, montagna"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className={`flex items-center gap-2 cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
          <span className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
            {uploading ? "Caricamento..." : "📷 Aggiungi foto"}
          </span>
          <span className="text-xs text-muted-foreground">Clicca su una foto per impostarla come featured image</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
        </label>
        {uploadedPaths.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {uploadedPaths.map((p) => {
              const cdn = "https://cdn.codeandrun.it";
              const isFeatured = featuredImage === p;
              return (
                <button
                  key={p}
                  onClick={() => setFeaturedImage(p)}
                  title={isFeatured ? "Featured image" : "Imposta come featured"}
                  className={`relative rounded overflow-hidden border-2 transition-colors ${isFeatured ? "border-[#FC4C02]" : "border-transparent hover:border-muted-foreground"}`}
                >
                  <img src={`${cdn}${p}`} alt="" className="h-16 w-16 object-cover" />
                  {isFeatured && (
                    <span className="absolute bottom-0 left-0 right-0 bg-[#FC4C02] text-white text-[9px] font-bold text-center py-0.5">
                      FEATURED
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Corpo del post (MDX)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={16}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <button
        onClick={handlePublish}
        disabled={publishing}
        className="w-full rounded-md bg-[#FC4C02] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#e04400] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {publishing ? "Pubblicazione..." : "Pubblica"}
      </button>
    </div>
  );
}
