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
  wpPostId?: number;
  wpPostUrl?: string;
  legacyPublished?: boolean;
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

export default function StravaActivities({ isWpUser }: { isWpUser: boolean }) {
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

  const fetchActivities = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/strava/activities?page=${p}`);
      const data = await res.json();
      setActivities(data.activities ?? []);
      setTotalPages(data.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities(page);
  }, [fetchActivities, page]);

  const updateWpStatus = async (id: number, action: "clear" | "mark") => {
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
          ? { ...a, wpPostId: undefined, wpPostUrl: undefined, legacyPublished: undefined }
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
      const res = await fetch("/api/strava/activities/wordpress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityIds: [...selected],
          title: modal.title,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(t.strava.draftCreated, {
        description: (
          <a href={data.postUrl} target="_blank" rel="noopener noreferrer" className="underline">
            {data.postUrl}
          </a>
        ) as any,
        duration: 10000,
      });
      setSelected(new Set());
      fetchActivities(page);
    } catch {
      toast.error(t.strava.draftError);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
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
                <th className="w-8 px-3 py-2"></th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Data</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nome</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">Tipo</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground hidden sm:table-cell">Distanza</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground hidden md:table-cell">Durata</th>
                {isWpUser && <th className="w-16 px-3 py-2 text-center font-medium text-muted-foreground">WP</th>}
              </tr>
            </thead>
            <tbody>
              {activities.map((activity, i) => {
                const isSelected = selected.has(activity.id);
                const date = new Date(activity.start_date_local);
                return (
                  <tr
                    key={activity.id}
                    onClick={() => toggleSelect(activity.id)}
                    className={`cursor-pointer border-t border-border transition-colors ${
                      isSelected
                        ? "bg-primary/5"
                        : i % 2 === 0
                        ? "hover:bg-muted/40"
                        : "bg-muted/20 hover:bg-muted/40"
                    }`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(activity.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded"
                      />
                    </td>
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
                    {isWpUser && (
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        {activity.wpPostId || activity.legacyPublished ? (
                          <div className="flex items-center justify-center gap-1">
                            {activity.wpPostId ? (
                              <a
                                href={activity.wpPostUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Post #${activity.wpPostId}`}
                              >
                                📝
                              </a>
                            ) : (
                              <span title="Pubblicato nel vecchio sistema" className="opacity-50">📝</span>
                            )}
                            <button
                              onClick={() => updateWpStatus(activity.id, "clear")}
                              title="Rimuovi stato pubblicazione"
                              className="text-xs text-muted-foreground/50 hover:text-destructive leading-none"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => updateWpStatus(activity.id, "mark")}
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
