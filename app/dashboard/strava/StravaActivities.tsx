"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import { yamlStr, yamlArray } from "@/lib/posts/buildMdx";
import type { AstroDraft } from "@/lib/strava/astro-draft";
import PhotoPicker from "@/components/media/PhotoPicker";

const TRAINING_TYPE_OPTIONS = ["🟢", "🟡", "🔴", "🏁"];
const TRAINING_FEELING_OPTIONS = ["😀", "🙂", "😐", "🫤", "🙁", "😭", "☠️"];

function csvToArray(s: string): string[] {
  return s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

interface Activity {
  id: number;
  name: string;
  start_date_local: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  suffer_score?: number;
  wpPostId?: number;
  wpPostUrl?: string;
  legacyPublished?: boolean;
  astroSlug?: string;
  astroPostUrl?: string;
}

function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(2) + " km";
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function isoWeek(dateStr: string): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - w1.getTime()) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}

function EmojiPicker({
  value,
  options,
  onChange,
  title,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={title}
        className="w-12 rounded-md border border-border bg-background px-2 py-1 text-sm text-center hover:bg-muted transition-colors"
      >
        {value || "—"}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 right-0 top-full mt-1 w-40 rounded-md border border-border bg-background shadow-lg p-2 space-y-2">
            <div className="flex flex-wrap gap-1">
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={`rounded-md border px-2 py-1 text-sm hover:bg-muted transition-colors ${
                    opt === value ? "border-[#FC4C02]" : "border-border"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="altro..."
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && custom.trim()) {
                  onChange(custom.trim());
                  setCustom("");
                  setOpen(false);
                }
              }}
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </>
      )}
    </div>
  );
}

function buildDraftMdx(fm: AstroDraft["frontmatter"], activities: AstroDraft["activities"], body: string): string {
  const lines = ["---"];
  lines.push(`title: ${yamlStr(fm.title)}`);
  lines.push(`date: ${fm.date}`);
  lines.push(`excerpt: ${yamlStr(fm.excerpt)}`);
  if (fm.seoDescription) lines.push(`seoDescription: ${yamlStr(fm.seoDescription)}`);
  lines.push(`categories: ${yamlArray(fm.categories)}`);
  if (fm.tags.length) lines.push(`tags: ${yamlArray(fm.tags)}`);
  if (fm.featuredImage) lines.push(`featuredImage: ${yamlStr(fm.featuredImage)}`);
  lines.push(`car_week: ${yamlStr(fm.car_week)}`);
  lines.push(`car_km: ${yamlStr(fm.car_km)}`);
  lines.push(`training_types: ${yamlArray(activities.map((a) => a.trainingType))}`);
  lines.push(`training_feelings: ${yamlArray(activities.map((a) => a.trainingFeeling))}`);
  lines.push("---");
  return `${lines.join("\n")}\n\n${body.trim()}\n`;
}

function MdxModal({
  draft,
  filename,
  postFolder,
  onClose,
  onPublished,
}: {
  draft: AstroDraft;
  filename: string;
  postFolder: string;
  onClose: () => void;
  onPublished: () => void;
}) {
  const [title, setTitle] = useState(draft.frontmatter.title);
  const [date, setDate] = useState(draft.frontmatter.date);
  const [excerpt, setExcerpt] = useState(draft.frontmatter.excerpt);
  const [seoDescription, setSeoDescription] = useState(draft.frontmatter.seoDescription);
  const [categoriesText, setCategoriesText] = useState(draft.frontmatter.categories.join(", "));
  const [tagsText, setTagsText] = useState(draft.frontmatter.tags.join(", "));
  const [featuredImage, setFeaturedImage] = useState(draft.frontmatter.featuredImage);
  const [carWeek, setCarWeek] = useState(draft.frontmatter.car_week);
  const [carKm, setCarKm] = useState(draft.frontmatter.car_km);
  const [activities, setActivities] = useState(draft.activities);
  const [body, setBody] = useState(draft.body);

  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<{ url: string } | null>(null);

  const mdxContent = useMemo(
    () =>
      buildDraftMdx(
        {
          title,
          date,
          excerpt,
          seoDescription,
          categories: csvToArray(categoriesText),
          tags: csvToArray(tagsText),
          featuredImage,
          car_week: carWeek,
          car_km: carKm,
        },
        activities,
        body
      ),
    [title, date, excerpt, seoDescription, categoriesText, tagsText, featuredImage, carWeek, carKm, activities, body]
  );

  const setActivityField = (id: number, field: "trainingType" | "trainingFeeling", value: string) => {
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mdxContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch("/api/posts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, content: mdxContent }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error === "already_exists" ? "Esiste già un post con questo slug/data" : "Pubblicazione fallita");
        return;
      }
      setPublished({ url: data.url });
      toast.success("Post pubblicato!");
      onPublished();
    } catch {
      toast.error("Pubblicazione fallita, riprova");
    } finally {
      setPublishing(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([mdxContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInsertPaths = (paths: string[]) => {
    // Inserisci le figure prima di "## Uscite"
    const figures = paths
      .map((p) => `<figure class="wp-block-image size-large"><img src="${p}" alt="" /></figure>`)
      .join("\n\n");
    setBody((prev) =>
      prev.includes("## Uscite")
        ? prev.replace("## Uscite", `${figures}\n\n## Uscite`)
        : prev + "\n\n" + figures
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-lg border border-border shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">Bozza generata</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Salva in <code className="bg-muted px-1 rounded">src/content/posts/{filename}</code>
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none ml-4">×</button>
        </div>

        <div className="flex-1 overflow-auto px-4 py-3 space-y-4">
          {/* Upload foto */}
          <PhotoPicker
            folder={postFolder}
            featuredImage={featuredImage}
            onFeaturedChange={setFeaturedImage}
            onInsert={handleInsertPaths}
          />

          {/* Frontmatter */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Titolo</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Settimana (car_week)</label>
              <input
                type="text"
                value={carWeek}
                onChange={(e) => setCarWeek(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Km (car_km)</label>
              <input
                type="text"
                value={carKm}
                onChange={(e) => setCarKm(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Estratto</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">SEO description</label>
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Categorie</label>
              <input
                type="text"
                placeholder="Running, Sport"
                value={categoriesText}
                onChange={(e) => setCategoriesText(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tag</label>
              <input
                type="text"
                placeholder="weekly, lungo, caldo"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Emoji per attività */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Attività</label>
            <div className="space-y-1.5">
              {activities.map((a) => (
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
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Corpo del post (MDX)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {published && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm space-y-1">
              <p className="font-medium">Pubblicato ✓</p>
              <a href={published.url} target="_blank" rel="noopener noreferrer" className="text-[#FC4C02] hover:underline break-all">
                {published.url}
              </a>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={handlePublish}
            disabled={publishing || !!published}
            className="flex-1 rounded-md bg-[#FC4C02] px-4 py-2 text-sm font-medium text-white hover:bg-[#e04400] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {publishing ? "Pubblicazione..." : published ? "Pubblicato" : "Pubblica"}
          </button>
          <button
            onClick={handleDownload}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            Download
          </button>
          <button
            onClick={handleCopy}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            {copied ? "Copiato!" : "Copia"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StravaActivities({
  isWpUser,
  apiBase = "/api",
  readOnly = false,
}: {
  isWpUser: boolean;
  apiBase?: string;
  readOnly?: boolean;
}) {
  const { t } = useTranslations();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<{ open: boolean; title: string }>({
    open: false,
    title: "",
  });
  const [creating, setCreating] = useState(false);
  const [mdxModal, setMdxModal] = useState<{ draft: AstroDraft; filename: string; postFolder: string } | null>(null);

  const fetchActivities = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/strava/activities?page=${p}`);
      const data = await res.json();
      setActivities(data.activities ?? []);
      setTotalPages(data.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchActivities(page);
  }, [fetchActivities, page]);

  const updateBlogStatus = async (id: number, action: "clear" | "mark") => {
    await fetch(`/api/strava/activities/${id}/wp-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setActivities((prev) =>
      prev.map((a) =>
        a.id !== id
          ? a
          : action === "clear"
          ? { ...a, wpPostId: undefined, wpPostUrl: undefined, legacyPublished: undefined, astroSlug: undefined, astroPostUrl: undefined }
          : { ...a, legacyPublished: true, wpPostId: undefined, wpPostUrl: undefined }
      )
    );
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openModal = () => {
    if (selected.size === 0) return;
    const selectedActivities = activities.filter((a) => selected.has(a.id));
    const weeks = [
      ...new Set(selectedActivities.map((a) => isoWeek(a.start_date_local))),
    ].sort((a, b) => a - b);
    setModal({ open: true, title: `W${weeks.join("-")}` });
  };

  const confirmDraft = async () => {
    setModal((m) => ({ ...m, open: false }));
    setCreating(true);
    try {
      const res = await fetch("/api/strava/activities/astro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityIds: [...selected],
          title: modal.title,
        }),
      });
      const draft: AstroDraft = await res.json();
      if (!res.ok) throw new Error((draft as unknown as { error?: string }).error);
      // postFolder = YYYY/MM dal nome file (es. 2026-06-02-... → 2026/06)
      const postFolder = draft.filename.substring(0, 7).replace("-", "/");
      setMdxModal({ draft, filename: draft.filename, postFolder });
      setSelected(new Set());
      fetchActivities(page);
    } catch {
      toast.error(t.strava.draftError);
    } finally {
      setCreating(false);
    }
  };

  const isPublished = (activity: Activity) =>
    !!(activity.wpPostId || activity.astroSlug || activity.legacyPublished);

  const postUrl = (activity: Activity): string | undefined =>
    activity.astroPostUrl
      ? `https://www.codeandrun.it${activity.astroPostUrl}`
      : activity.wpPostUrl;

  return (
    <div>
      {mdxModal && (
        <MdxModal
          draft={mdxModal.draft}
          filename={mdxModal.filename}
          postFolder={mdxModal.postFolder}
          onClose={() => setMdxModal(null)}
          onPublished={() => fetchActivities(page)}
        />
      )}

      {/* Toolbar */}
      {isWpUser && (
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={openModal}
            disabled={selected.size === 0 || creating}
            className="rounded-md bg-[#FC4C02] px-4 py-2 text-sm font-medium text-white hover:bg-[#e04400] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {creating ? t.strava.creatingDraft : t.strava.createDraft}
            {selected.size > 0 && !creating && ` (${selected.size})`}
          </button>
          {selected.size > 0 && (
            <button
              onClick={() => setSelected(new Set())}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Deseleziona tutto
            </button>
          )}
        </div>
      )}

      {/* Tabella */}
      {loading ? (
        <p className="text-sm text-muted-foreground">{t.strava.loadingActivities}</p>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.strava.noActivities}</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {!readOnly && <th className="w-8 px-3 py-2"></th>}
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Data</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">Tipo</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground hidden sm:table-cell">Distanza</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground hidden md:table-cell">Durata</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground hidden lg:table-cell">Sforzo</th>
                {isWpUser && <th className="w-16 px-3 py-2 text-center font-medium text-muted-foreground">Blog</th>}
              </tr>
            </thead>
            <tbody>
              {activities.map((activity, i) => {
                const published = isPublished(activity);
                const url = postUrl(activity);
                const isSelected = !readOnly && selected.has(activity.id);
                const date = new Date(activity.start_date_local);
                return (
                  <tr
                    key={activity.id}
                    onClick={() => !readOnly && toggleSelect(activity.id)}
                    className={`border-t border-border transition-colors ${
                      readOnly
                        ? i % 2 === 0 ? "" : "bg-muted/20"
                        : isSelected
                        ? "cursor-pointer bg-primary/5"
                        : i % 2 === 0
                        ? "cursor-pointer hover:bg-muted/40"
                        : "cursor-pointer bg-muted/20 hover:bg-muted/40"
                    }`}
                  >
                    {!readOnly && (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(activity.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded"
                        />
                      </td>
                    )}
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {date.toLocaleDateString("it-IT", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-2 font-medium">{activity.name}</td>
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                      {activity.sport_type}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground hidden sm:table-cell">
                      {activity.distance > 0 ? formatDistance(activity.distance) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground hidden md:table-cell">
                      {formatDuration(activity.moving_time)}
                    </td>
                    <td className="px-3 py-2 text-right hidden lg:table-cell">
                      {activity.suffer_score != null ? (
                        <span className={
                          activity.suffer_score >= 200 ? "text-red-500 font-medium" :
                          activity.suffer_score >= 100 ? "text-orange-500 font-medium" :
                          activity.suffer_score >= 50  ? "text-yellow-500" :
                          "text-muted-foreground"
                        }>
                          {activity.suffer_score}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    {isWpUser && (
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        {published ? (
                          <div className="flex items-center justify-center gap-1">
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={activity.astroSlug ?? `Post #${activity.wpPostId}`}
                              >
                                📝
                              </a>
                            ) : (
                              <span title="Pubblicato" className="opacity-50">📝</span>
                            )}
                            <button
                              onClick={() => updateBlogStatus(activity.id, "clear")}
                              title="Rimuovi stato pubblicazione"
                              className="text-xs text-muted-foreground/50 hover:text-destructive leading-none"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => updateBlogStatus(activity.id, "mark")}
                            title="Segna come pubblicato"
                            className="text-muted-foreground/30 hover:text-muted-foreground text-base leading-none"
                          >
                            —
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginazione */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t.strava.prevPage}
          </button>
          <span className="text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t.strava.nextPage}
          </button>
        </div>
      )}

      {/* Modal titolo */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-lg border border-border shadow-lg p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-semibold mb-4">{t.strava.modalTitle}</h2>
            <input
              type="text"
              value={modal.title}
              onChange={(e) => setModal((m) => ({ ...m, title: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && confirmDraft()}
              autoFocus
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={confirmDraft}
                className="flex-1 rounded-md bg-[#FC4C02] px-4 py-2 text-sm font-medium text-white hover:bg-[#e04400] transition-colors"
              >
                {t.strava.modalConfirm}
              </button>
              <button
                onClick={() => setModal({ open: false, title: "" })}
                className="flex-1 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                {t.strava.modalCancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
