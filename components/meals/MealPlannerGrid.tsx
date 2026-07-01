"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type CellKey = `${number}-${MealType}`;

const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: "breakfast", label: "Colazione" },
  { key: "lunch", label: "Pranzo" },
  { key: "dinner", label: "Cena" },
  { key: "snack", label: "Spuntino" },
];

const DAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function getMondayOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00Z");
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("it-IT", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${fmt(start)} – ${fmt(end)} ${start.getUTCFullYear()}`;
}

function addWeeks(weekStr: string, n: number): string {
  const d = new Date(weekStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n * 7);
  return toDateStr(d);
}

function emptyMap(): Record<CellKey, string> {
  return {} as Record<CellKey, string>;
}

interface Props {
  apiBase?: string;
  readOnly?: boolean;
}

export default function MealPlannerGrid({ apiBase = "/api/meals", readOnly = false }: Props) {
  const todayMonday = toDateStr(getMondayOfWeek(new Date()));
  const [weekStart, setWeekStart] = useState(todayMonday);
  const [cells, setCells] = useState<Record<CellKey, string>>(emptyMap);
  const [savedCells, setSavedCells] = useState<Record<CellKey, string>>(emptyMap);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<CellKey | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadWeek = useCallback(async (week: string) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}?week=${week}`, { signal: ac.signal });
      if (!res.ok) throw new Error();
      const data: Array<{ day: number; mealType: MealType; content: string }> = await res.json();
      const map = emptyMap();
      for (const entry of data) {
        map[`${entry.day}-${entry.mealType}`] = entry.content;
      }
      setCells(map);
      setSavedCells(map);
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error("Errore nel caricamento");
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeek(weekStart);
  }, [weekStart, loadWeek]);

  const handleBlur = useCallback(
    async (day: number, mealType: MealType) => {
      if (readOnly) return;
      const key: CellKey = `${day}-${mealType}`;
      const current = cells[key] ?? "";
      const saved = savedCells[key] ?? "";
      if (current === saved) return;

      setSaving(key);
      try {
        const res = await fetch(apiBase, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weekStart, day, mealType, content: current }),
        });
        if (!res.ok) throw new Error();
        setSavedCells((prev) => ({ ...prev, [key]: current }));
      } catch {
        toast.error("Errore nel salvataggio");
        setCells((prev) => ({ ...prev, [key]: saved }));
      } finally {
        setSaving(null);
      }
    },
    [cells, savedCells, weekStart]
  );

  const dayDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + i);
    return d.getUTCDate();
  });

  // Determine today's column index (0=Mon … 6=Sun), or -1 if not this week
  const todayColIndex = (() => {
    if (weekStart !== todayMonday) return -1;
    const dow = new Date().getDay(); // 0=Sun
    return dow === 0 ? 6 : dow - 1;
  })();

  return (
    <div className="flex flex-col gap-4">
      {/* Week navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setWeekStart((w) => addWeeks(w, -1))}
          className="flex items-center justify-center w-8 h-8 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Settimana precedente"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium flex-1 text-center min-w-0 truncate">
          {formatWeekRange(weekStart)}
        </span>
        <button
          onClick={() => setWeekStart((w) => addWeeks(w, 1))}
          className="flex items-center justify-center w-8 h-8 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Settimana successiva"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {weekStart !== todayMonday && (
          <button
            onClick={() => setWeekStart(todayMonday)}
            className="px-3 py-1 rounded-full text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap"
          >
            Oggi
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <div className="min-w-[600px]">
          {/* Header */}
          <div className="grid grid-cols-[100px_repeat(7,1fr)] border-b border-border bg-muted/40">
            <div className="px-3 py-2.5" />
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                className={`px-2 py-2.5 text-center ${
                  i === todayColIndex ? "bg-primary/8" : ""
                }`}
              >
                <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {label}
                </span>
                <span
                  className={`block text-sm font-semibold mt-0.5 ${
                    i === todayColIndex ? "text-primary" : ""
                  }`}
                >
                  {dayDates[i]}
                </span>
              </div>
            ))}
          </div>

          {/* Meal rows */}
          {MEAL_TYPES.map(({ key: mealType, label }, rowIdx) => (
            <div
              key={mealType}
              className={`grid grid-cols-[100px_repeat(7,1fr)] ${
                rowIdx < MEAL_TYPES.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="px-3 py-3 flex items-center border-r border-border bg-muted/20">
                <span className="text-xs font-semibold text-muted-foreground">{label}</span>
              </div>
              {Array.from({ length: 7 }, (_, day) => {
                const cellKey: CellKey = `${day}-${mealType}`;
                const isDirty = (cells[cellKey] ?? "") !== (savedCells[cellKey] ?? "");
                return (
                  <div
                    key={day}
                    className={`relative ${day < 6 ? "border-r border-border" : ""} ${
                      day === todayColIndex ? "bg-primary/5" : ""
                    }`}
                  >
                    <textarea
                      value={cells[cellKey] ?? ""}
                      onChange={(e) =>
                        !readOnly &&
                        setCells((prev) => ({ ...prev, [cellKey]: e.target.value }))
                      }
                      onBlur={() => handleBlur(day, mealType)}
                      disabled={loading}
                      readOnly={readOnly}
                      placeholder={loading ? "" : "…"}
                      rows={2}
                      className={`w-full h-full min-h-[60px] px-2 py-2 text-xs bg-transparent resize-none focus:outline-none transition-colors placeholder:text-muted-foreground/25 disabled:opacity-40 leading-relaxed ${
                        readOnly ? "cursor-default select-text" : "focus:bg-primary/8"
                      }`}
                    />
                    {!readOnly && saving === cellKey && (
                      <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                    {!readOnly && isDirty && saving !== cellKey && (
                      <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Le modifiche vengono salvate automaticamente quando esci dalla cella.
      </p>
    </div>
  );
}
