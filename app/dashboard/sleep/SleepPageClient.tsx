"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea,
} from "recharts";
import { toast } from "sonner";

type SleepEntry = {
  calendarDate: string;
  sleepTimeSeconds: number | null;
  deepSleepSeconds: number | null;
  lightSleepSeconds: number | null;
  remSleepSeconds: number | null;
  awakeSleepSeconds: number | null;
  averageSpO2Value: number | null;
  sleepScore: number | null;
  averageRespirationValue: number | null;
  perceivedQuality: number | null;
  awakenings: number | null;
  notes: string | null;
};

type StravaEvent = {
  _id: string;
  description: string;
  start_date: string;
  end_date: string;
  type: string;
};

type Period = "1m" | "3m" | "6m" | "1y" | "all";

function fromDate(period: Period): string {
  const d = new Date();
  if (period === "1m") d.setMonth(d.getMonth() - 1);
  else if (period === "3m") d.setMonth(d.getMonth() - 3);
  else if (period === "6m") d.setMonth(d.getMonth() - 6);
  else if (period === "1y") d.setFullYear(d.getFullYear() - 1);
  else return "2000-01-01";
  return d.toISOString().substring(0, 10);
}

function toHours(seconds: number | null): number | null {
  if (seconds == null) return null;
  return Math.round((seconds / 3600) * 10) / 10;
}

function formatDate(s: string): string {
  const [, m, d] = s.split("-");
  return `${d}/${m}`;
}

function formatHours(h: number): string {
  const hrs = Math.floor(h);
  const min = Math.round((h - hrs) * 60);
  return min > 0 ? `${hrs}h ${min}m` : `${hrs}h`;
}

function StarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (hover ?? value ?? 0) >= star;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star === value ? 0 : star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(null)}
            className="text-xl leading-none transition-colors"
            style={{ color: filled ? "var(--chart-4)" : "var(--muted-foreground)" }}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as SleepEntry & {
    deep: number | null;
    rem: number | null;
    light: number | null;
    awake: number | null;
    total: number | null;
  };
  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-md text-sm space-y-1 min-w-44">
      <p className="font-medium">{label}</p>
      {d.total != null && (
        <p>Totale: <span className="font-semibold">{formatHours(d.total)}</span></p>
      )}
      {d.deep != null && <p className="text-[var(--chart-1)]">Deep: {formatHours(d.deep)}</p>}
      {d.rem != null && <p className="text-[var(--chart-2)]">REM: {formatHours(d.rem)}</p>}
      {d.light != null && <p className="text-[var(--chart-3)]">Light: {formatHours(d.light)}</p>}
      {d.awake != null && <p className="text-muted-foreground">Sveglio: {formatHours(d.awake)}</p>}
      {d.sleepScore != null && <p>Score: <span className="font-semibold">{d.sleepScore}</span></p>}
      {d.averageSpO2Value != null && (
        <p className="text-muted-foreground">SpO₂: {d.averageSpO2Value}%</p>
      )}
      {(d.perceivedQuality != null || d.awakenings != null || d.notes) && (
        <div className="border-t border-border pt-1 mt-1 space-y-0.5">
          {d.perceivedQuality != null && (
            <p>
              Qualità:{" "}
              <span style={{ color: "var(--chart-4)" }}>
                {"★".repeat(d.perceivedQuality)}{"☆".repeat(5 - d.perceivedQuality)}
              </span>
            </p>
          )}
          {d.awakenings != null && <p>Risvegli: <span className="font-semibold">{d.awakenings}</span></p>}
          {d.notes && <p className="text-muted-foreground italic truncate max-w-52">{d.notes}</p>}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground pt-0.5">Clic per aggiungere note</p>
    </div>
  );
}

const PERIODS: { label: string; value: Period }[] = [
  { label: "1M", value: "1m" },
  { label: "3M", value: "3m" },
  { label: "6M", value: "6m" },
  { label: "1A", value: "1y" },
  { label: "Tutto", value: "all" },
];

type EditState = {
  calendarDate: string;
  perceivedQuality: number | null;
  awakenings: string;
  notes: string;
};

export default function SleepPageClient() {
  const [period, setPeriod] = useState<Period>("1m");
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [events, setEvents] = useState<StravaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScore, setShowScore] = useState(true);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const [sleepRes, eventsRes] = await Promise.all([
        fetch(`/api/sleep?from=${fromDate(p)}`),
        fetch("/api/events"),
      ]);
      const sleepJson = await sleepRes.json();
      const eventsJson = await eventsRes.json();
      setEntries(sleepJson.sleep ?? []);
      setEvents(Array.isArray(eventsJson) ? eventsJson : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [fetchData, period]);

  useEffect(() => {
    if (!editing) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setEditing(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editing]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBarClick = useCallback((data: any) => {
    const entry = data as SleepEntry | undefined;
    if (!entry?.calendarDate) return;
    setEditing({
      calendarDate: entry.calendarDate,
      perceivedQuality: entry.perceivedQuality ?? null,
      awakenings: entry.awakenings != null ? String(entry.awakenings) : "",
      notes: entry.notes ?? "",
    });
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch("/api/sleep", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarDate: editing.calendarDate,
          perceivedQuality: editing.perceivedQuality ?? null,
          awakenings: editing.awakenings !== "" ? Number(editing.awakenings) : null,
          notes: editing.notes || null,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setEntries((prev) =>
        prev.map((e) =>
          e.calendarDate === editing.calendarDate
            ? { ...e, ...updated.sleep }
            : e
        )
      );
      toast.success("Salvato");
      setEditing(null);
    } catch {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const chartData = entries.map((e) => ({
    ...e,
    deep: toHours(e.deepSleepSeconds),
    rem: toHours(e.remSleepSeconds),
    light: toHours(e.lightSleepSeconds),
    awake: toHours(e.awakeSleepSeconds),
    total: toHours(e.sleepTimeSeconds),
  }));

  const periodFrom = fromDate(period);
  const lastDate = chartData[chartData.length - 1]?.calendarDate ?? "9999-12-31";
  const visibleEvents = events.filter(
    (ev) => ev.end_date >= periodFrom && ev.start_date <= lastDate
  );

  const avgTotal =
    chartData.length > 0
      ? chartData.reduce((s, d) => s + (d.total ?? 0), 0) / chartData.filter((d) => d.total != null).length
      : null;
  const avgScore =
    chartData.filter((d) => d.sleepScore != null).length > 0
      ? chartData.reduce((s, d) => s + (d.sleepScore ?? 0), 0) /
        chartData.filter((d) => d.sleepScore != null).length
      : null;
  const avgDeep =
    chartData.filter((d) => d.deep != null).length > 0
      ? chartData.reduce((s, d) => s + (d.deep ?? 0), 0) /
        chartData.filter((d) => d.deep != null).length
      : null;
  const avgRem =
    chartData.filter((d) => d.rem != null).length > 0
      ? chartData.reduce((s, d) => s + (d.rem ?? 0), 0) /
        chartData.filter((d) => d.rem != null).length
      : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Stats row */}
      {!loading && chartData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Durata media", value: avgTotal != null ? formatHours(avgTotal) : "—" },
            { label: "Score medio", value: avgScore != null ? Math.round(avgScore).toString() : "—" },
            { label: "Deep medio", value: avgDeep != null ? formatHours(avgDeep) : "—" },
            { label: "REM medio", value: avgRem != null ? formatHours(avgRem) : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="h-[3px] bg-[var(--chart-1)]" />
        <div className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="text-base font-semibold">Fasi del sonno</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={showScore}
                  onChange={(e) => setShowScore(e.target.checked)}
                  className="rounded"
                />
                Sleep score
              </label>
              <div className="flex gap-1.5">
                {PERIODS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      period === p.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
              Caricamento...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">
              Nessun dato nel periodo selezionato
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart
                data={chartData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="calendarDate"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="hours"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}h`}
                />
                {showScore && (
                  <YAxis
                    yAxisId="score"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                )}
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      deep: "Deep",
                      rem: "REM",
                      light: "Light",
                      awake: "Sveglio",
                      sleepScore: "Score",
                    };
                    return labels[value] ?? value;
                  }}
                />
                {visibleEvents.map((ev) => (
                  <ReferenceArea
                    key={ev._id}
                    yAxisId="hours"
                    x1={ev.start_date}
                    x2={ev.end_date}
                    fill="var(--chart-4)"
                    fillOpacity={0.08}
                    stroke="var(--chart-4)"
                    strokeOpacity={0.3}
                    strokeWidth={1}
                    label={{ value: ev.description, position: "insideTopLeft", fontSize: 10, fill: "var(--chart-4)", dy: 4 }}
                  />
                ))}
                <Bar yAxisId="hours" dataKey="deep" stackId="sleep" fill="var(--chart-1)" cursor="pointer" onClick={handleBarClick} />
                <Bar yAxisId="hours" dataKey="rem" stackId="sleep" fill="var(--chart-2)" cursor="pointer" onClick={handleBarClick} />
                <Bar yAxisId="hours" dataKey="light" stackId="sleep" fill="var(--chart-3)" radius={[3, 3, 0, 0]} cursor="pointer" onClick={handleBarClick} />
                <Bar yAxisId="hours" dataKey="awake" stackId="sleep" fill="var(--chart-5)" opacity={0.4} radius={[3, 3, 0, 0]} cursor="pointer" onClick={handleBarClick} />
                {showScore && (
                  <Line
                    yAxisId="score"
                    type="monotone"
                    dataKey="sleepScore"
                    stroke="var(--chart-4)"
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Edit panel */}
      {editing && (
        <div
          ref={panelRef}
          className="rounded-xl border border-border overflow-hidden"
        >
          <div className="h-[3px] bg-[var(--chart-4)]" />
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Annotazione —{" "}
                <span className="text-muted-foreground font-normal">
                  {formatDate(editing.calendarDate)}
                </span>
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Qualità percepita</label>
                <StarRating
                  value={editing.perceivedQuality}
                  onChange={(v) =>
                    setEditing((prev) => prev && { ...prev, perceivedQuality: v || null })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Risvegli</label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={editing.awakenings}
                  onChange={(e) =>
                    setEditing((prev) => prev && { ...prev, awakenings: e.target.value })
                  }
                  placeholder="0"
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Note</label>
                <input
                  type="text"
                  value={editing.notes}
                  onChange={(e) =>
                    setEditing((prev) => prev && { ...prev, notes: e.target.value })
                  }
                  placeholder="es. stress, alcol, mal di testa…"
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-1.5 rounded-md text-sm border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 rounded-md text-sm bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? "Salvataggio…" : "Salva"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
