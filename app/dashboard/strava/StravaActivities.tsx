"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n/LanguageContext";

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

function MdxModal({
  mdxContent: initialMdx,
  filename,
  postFolder,
  onClose,
}: {
  mdxContent: string;
  filename: string;
  postFolder: string;
  onClose: () => void;
}) {
  const [mdxContent, setMdxContent] = useState(initialMdx);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mdxContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    const paths: string[] = [];
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", postFolder);
      const res = await fetch("/api/strava/activities/astro/upload-media", { method: "POST", body: form });
      const data = await res.json();
      if (data.path) paths.push(data.path);
    }
    setUploading(false);
    if (!paths.length) return;
    setUploadedPaths((prev) => [...prev, ...paths]);

    // Inserisci le figure prima di "## Uscite"
    const figures = paths
      .map((p) => `<figure class="wp-block-image size-large"><img src="${p}" alt="" /></figure>`)
      .join("\n\n");
    setMdxContent((prev) =>
      prev.includes("## Uscite")
        ? prev.replace("## Uscite", `${figures}\n\n## Uscite`)
        : prev + "\n\n" + figures
    );
    e.target.value = "";
  };

  const setAsFeatured = (path: string) => {
    setFeaturedImage(path);
    setMdxContent((prev) => {
      // Aggiorna o aggiunge featuredImage nel frontmatter
      if (prev.includes("featuredImage:")) {
        return prev.replace(/featuredImage:.*/, `featuredImage: "${path}"`);
      }
      return prev.replace(/(categories:.+\n)/, `$1featuredImage: "${path}"\n`);
    });
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

        {/* Upload foto */}
        <div className="px-4 py-3 border-b border-border bg-muted/20 space-y-2">
          <label className={`flex items-center gap-2 cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
            <span className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
              {uploading ? "Caricamento..." : "📷 Aggiungi foto"}
            </span>
            <span className="text-xs text-muted-foreground">
              Clicca su una foto per impostarla come featured image
            </span>
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
                    onClick={() => setAsFeatured(p)}
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

        <pre className="flex-1 overflow-auto text-xs p-4 bg-muted/30 font-mono whitespace-pre">
          {mdxContent}
        </pre>
        <div className="flex gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={handleDownload}
            className="flex-1 rounded-md bg-[#FC4C02] px-4 py-2 text-sm font-medium text-white hover:bg-[#e04400] transition-colors"
          >
            Download {filename}
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
  const [mdxModal, setMdxModal] = useState<{ mdxContent: string; filename: string; postFolder: string } | null>(null);

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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // postFolder = YYYY/MM dal nome file (es. 2026-06-02-... → 2026/06)
      const postFolder = data.filename.substring(0, 7).replace("-", "/");
      setMdxModal({ mdxContent: data.mdxContent, filename: data.filename, postFolder });
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
          mdxContent={mdxModal.mdxContent}
          filename={mdxModal.filename}
          postFolder={mdxModal.postFolder}
          onClose={() => setMdxModal(null)}
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
