"use client";

import { useState } from "react";
import { toast } from "sonner";
import PhotoPicker from "@/components/media/PhotoPicker";
import { buildMdx } from "@/lib/posts/buildMdx";
import type { AstroDraft, AstroDraftActivity } from "@/lib/strava/astro-draft";
import { type Activity, isoWeek } from "../../activities";
import ActivityPickerModal from "./ActivityPickerModal";
import {
  EmojiPicker,
  TRAINING_TYPE_OPTIONS,
  TRAINING_FEELING_OPTIONS,
  buildDraftMdx,
} from "./stravaDraft";

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
  const [seoDescription, setSeoDescription] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [showMdx, setShowMdx] = useState(false);

  // Strava post: activities chosen in the picker, plus the fields only the draft generator fills
  const [stravaMode, setStravaMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [picked, setPicked] = useState<Activity[]>([]);
  const [draftActivities, setDraftActivities] = useState<AstroDraftActivity[]>([]);
  const [carWeek, setCarWeek] = useState("");
  const [carKm, setCarKm] = useState("");
  const [result, setResult] = useState<{ url: string; commitSha: string } | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(title);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  };

  const uploadFolder = date.slice(0, 7).replace("-", "/");

  const handleInsertPaths = (paths: string[]) => {
    const figures = paths
      .map((p) => `<figure class="wp-block-image size-large"><img src="${p}" alt="" /></figure>`)
      .join("\n\n");
    // In Strava posts the figures go before the generated "## Uscite" section
    setBody((prev) =>
      prev.includes("## Uscite")
        ? prev.replace("## Uscite", `${figures}\n\n## Uscite`)
        : prev
        ? `${prev}\n\n${figures}`
        : figures
    );
  };

  const handleGenerateDraft = async (activities: Activity[]) => {
    if (body.trim() && !window.confirm("Il corpo attuale verrà sostituito dalla bozza. Continuare?")) return;
    setPickerOpen(false);
    setGenerating(true);
    try {
      const weeks = [...new Set(activities.map((a) => isoWeek(a.start_date_local)))].sort((a, b) => a - b);
      const res = await fetch("/api/strava/activities/astro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityIds: activities.map((a) => a.id),
          title: title.trim() || `W${weeks.join("-")}`,
        }),
      });
      const draft: AstroDraft = await res.json();
      if (!res.ok) throw new Error();
      const fm = draft.frontmatter;
      setPicked(activities);
      setTitle(fm.title);
      setDate(fm.date);
      // filename is `${date}-${slug}.mdx`
      setSlug(draft.filename.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.mdx$/, ""));
      setSlugTouched(true);
      setExcerpt(fm.excerpt);
      setSeoDescription(fm.seoDescription);
      setCategories(fm.categories.join(", "));
      setTags(fm.tags.join(", "));
      setFeaturedImage(fm.featuredImage || null);
      setCarWeek(fm.car_week);
      setCarKm(fm.car_km);
      setDraftActivities(draft.activities);
      setBody(draft.body);
    } catch {
      toast.error("Generazione bozza fallita");
    } finally {
      setGenerating(false);
    }
  };

  const setActivityField = (id: number, field: "trainingType" | "trainingFeeling", value: string) => {
    setDraftActivities((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const fullMdx = () =>
    stravaMode
      ? buildDraftMdx(
          {
            title,
            date,
            excerpt,
            seoDescription,
            categories: csvToArray(categories),
            tags: csvToArray(tags),
            featuredImage: featuredImage ?? "",
            car_week: carWeek,
            car_km: carKm,
          },
          draftActivities,
          body
        )
      : buildMdx({
          title,
          date,
          excerpt: excerpt || undefined,
          seoDescription: seoDescription || undefined,
          categories: csvToArray(categories),
          tags: csvToArray(tags),
          featuredImage: featuredImage || undefined,
          body,
        });

  const handlePublish = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Titolo e corpo del post sono obbligatori");
      return;
    }
    if (stravaMode && draftActivities.length === 0) {
      toast.error("Scegli le attività e genera la bozza prima di pubblicare");
      return;
    }
    setPublishing(true);
    setResult(null);
    try {
      const payload = stravaMode
        ? {
            filename: `${date}-${effectiveSlug}.mdx`,
            content: buildDraftMdx(
              {
                title,
                date,
                excerpt,
                seoDescription,
                categories: csvToArray(categories),
                tags: csvToArray(tags),
                featuredImage: featuredImage ?? "",
                car_week: carWeek,
                car_km: carKm,
              },
              draftActivities,
              body
            ),
          }
        : {
            title,
            date,
            slug: effectiveSlug,
            excerpt: excerpt || undefined,
            seoDescription: seoDescription || undefined,
            categories: csvToArray(categories),
            tags: csvToArray(tags),
            featuredImage: featuredImage || undefined,
            body,
          };
      const res = await fetch("/api/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

      <div className="rounded-md border border-border p-3 space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={stravaMode}
            onChange={(e) => setStravaMode(e.target.checked)}
            className="rounded"
          />
          Post Strava
        </label>
        {stravaMode && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              disabled={generating}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors disabled:opacity-40"
            >
              {generating ? "Genero la bozza..." : picked.length ? "Cambia attività" : "Scegli attività"}
            </button>
            {picked.length > 0 && (
              <span className="text-xs text-muted-foreground">{picked.length} attività selezionate</span>
            )}
          </div>
        )}
      </div>

      {pickerOpen && (
        <ActivityPickerModal initial={picked} onClose={() => setPickerOpen(false)} onConfirm={handleGenerateDraft} />
      )}

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

      <div className="space-y-1">
        <label className="text-sm font-medium">SEO description</label>
        <textarea
          value={seoDescription}
          onChange={(e) => setSeoDescription(e.target.value)}
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

      {stravaMode && draftActivities.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Settimana (car_week)</label>
              <input
                type="text"
                value={carWeek}
                onChange={(e) => setCarWeek(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Km (car_km)</label>
              <input
                type="text"
                value={carKm}
                onChange={(e) => setCarKm(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Attività</label>
            {draftActivities.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{a.name}</span>
                <EmojiPicker
                  value={a.trainingType}
                  options={TRAINING_TYPE_OPTIONS}
                  onChange={(v) => setActivityField(a.id, "trainingType", v)}
                  title="Intensità"
                />
                <EmojiPicker
                  value={a.trainingFeeling}
                  options={TRAINING_FEELING_OPTIONS}
                  onChange={(v) => setActivityField(a.id, "trainingFeeling", v)}
                  title="Sensazione"
                />
              </div>
            ))}
          </div>
        </>
      )}

      <PhotoPicker
        folder={uploadFolder}
        featuredImage={featuredImage ?? ""}
        onFeaturedChange={setFeaturedImage}
        onInsert={handleInsertPaths}
      />

      <div className="space-y-1">
        <label className="text-sm font-medium">Corpo del post (MDX)</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={16}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowMdx((v) => !v)}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
        >
          {showMdx ? "Nascondi MDX completo" : "Mostra MDX completo"}
        </button>
        {showMdx && (
          <div className="space-y-1">
            <textarea
              readOnly
              value={fullMdx()}
              rows={20}
              className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-xs font-mono"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(fullMdx());
                toast.success("MDX copiato");
              }}
              className="text-xs text-[#FC4C02] hover:underline"
            >
              Copia
            </button>
          </div>
        )}
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
