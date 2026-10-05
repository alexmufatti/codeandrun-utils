"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import { type Activity, formatDistance, formatDuration } from "../../activities";

export default function ActivityPickerModal({
  initial,
  onClose,
  onConfirm,
}: {
  initial: Activity[];
  onClose: () => void;
  onConfirm: (activities: Activity[]) => void;
}) {
  const { t } = useTranslations();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Keyed by id so the selection survives page changes
  const [selected, setSelected] = useState<Map<number, Activity>>(
    () => new Map(initial.map((a) => [a.id, a]))
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/strava/activities?page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setActivities(data.activities ?? []);
        setTotalPages(data.totalPages ?? 1);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page]);

  const toggle = (a: Activity) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(a.id)) next.delete(a.id);
      else next.set(a.id, a);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-lg border border-border shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Scegli le attività</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 py-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t.strava.loadingActivities}</p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.strava.noActivities}</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {activities.map((a, i) => {
                    const isSelected = selected.has(a.id);
                    const used = !!(a.wpPostId || a.astroSlug || a.legacyPublished);
                    return (
                      <tr
                        key={a.id}
                        onClick={() => toggle(a)}
                        className={`cursor-pointer ${i > 0 ? "border-t border-border" : ""} ${
                          isSelected ? "bg-primary/5" : "hover:bg-muted/40"
                        }`}
                      >
                        <td className="w-8 px-3 py-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggle(a)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded"
                          />
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                          {new Date(a.start_date_local).toLocaleDateString("it-IT", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {a.name} {used && <span title="Già in un post">📝</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground hidden sm:table-cell">
                          {a.distance > 0 ? formatDistance(a.distance) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground hidden sm:table-cell">
                          {formatDuration(a.moving_time)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 text-sm">
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
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={() => onConfirm([...selected.values()])}
            disabled={selected.size === 0}
            className="flex-1 rounded-md bg-[#FC4C02] px-4 py-2 text-sm font-medium text-white hover:bg-[#e04400] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Genera bozza{selected.size > 0 && ` (${selected.size})`}
          </button>
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            {t.strava.modalCancel}
          </button>
        </div>
      </div>
    </div>
  );
}
