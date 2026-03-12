"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import type { CalendarEvent } from "./HrvPageClient";

type HrvEntry = {
  calendarDate: string;
  weeklyAvg: number | null;
  lastNightAvg: number | null;
  baseline?: { balancedLow?: number; balancedUpper?: number } | null;
};

type Period = "3m" | "6m" | "1y" | "all";

function fromDate(period: Period): string {
  const d = new Date();
  if (period === "3m") d.setMonth(d.getMonth() - 3);
  else if (period === "6m") d.setMonth(d.getMonth() - 6);
  else if (period === "1y") d.setFullYear(d.getFullYear() - 1);
  else return "2000-01-01";
  return d.toISOString().substring(0, 10);
}

function formatDate(s: string): string {
  const [, m, d] = s.split("-");
  return `${d}/${m}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDot(props: any) {
  const { cx, cy, index, data } = props;
  if (cx === undefined || cy === undefined) return null;
  const cur = data[index]?.weeklyAvg;
  const prev = data[index - 1]?.weeklyAvg;
  if (cur == null) return null;
  const color = prev != null && cur < prev ? "#ef4444" : "#22c55e";
  return <circle cx={cx} cy={cy} r={3} fill={color} stroke="none" />;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as HrvEntry & { baselineLow?: number; baselineHigh?: number };
  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-md text-sm space-y-1">
      <p className="font-medium">{label}</p>
      {d.weeklyAvg != null && <p>Weekly avg: <span className="font-semibold">{d.weeklyAvg}</span></p>}
      {d.lastNightAvg != null && <p>Last night: {d.lastNightAvg}</p>}
      {d.baselineLow != null && d.baselineHigh != null && (
        <p className="text-muted-foreground">Baseline: {d.baselineLow}–{d.baselineHigh}</p>
      )}
    </div>
  );
}

export default function HrvChart({ events }: { events: CalendarEvent[] }) {
  const [period, setPeriod] = useState<Period>("3m");
  const [data, setData] = useState<HrvEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLastNight, setShowLastNight] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hrv?from=${fromDate(p)}`);
      const json = await res.json();
      setData(json.hrv ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [fetchData, period]);

  const rangeStart = fromDate(period);
  const rangeEnd = new Date().toISOString().substring(0, 10);
  const visibleEvents = events.filter(
    (ev) => ev.start_date <= rangeEnd && ev.end_date >= rangeStart
  );

  const chartData = data.map((x) => ({
    ...x,
    baselineLow: x.baseline?.balancedLow ?? undefined,
    baselineHigh: x.baseline?.balancedUpper ?? undefined,
  }));

  const allValues = chartData.flatMap((d) => [
    d.weeklyAvg,
    d.lastNightAvg,
    d.baselineLow,
    d.baselineHigh,
  ]).filter((v): v is number => v != null);
  const yMin = allValues.length ? Math.floor(Math.min(...allValues)) - 2 : 20;
  const yMax = allValues.length ? Math.ceil(Math.max(...allValues)) + 2 : 120;

  const saveData = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      toast.error("JSON non valido");
      return;
    }
    const summaries =
      typeof parsed === "object" &&
      parsed !== null &&
      "hrvSummaries" in parsed &&
      Array.isArray((parsed as { hrvSummaries: unknown }).hrvSummaries)
        ? (parsed as { hrvSummaries: unknown[] }).hrvSummaries
        : Array.isArray(parsed)
        ? parsed
        : null;
    if (!summaries || !summaries.every((x: any) => x.calendarDate)) {
      toast.error("Formato non riconosciuto");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/hrv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(summaries),
      });
      const result = await res.json();
      toast.success(`Salvato: ${result.add} nuovi, ${result.duplicate} duplicati`);
      setInput("");
      fetchData(period);
    } catch {
      toast.error("Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const PERIODS: { label: string; value: Period }[] = [
    { label: "3M", value: "3m" },
    { label: "6M", value: "6m" },
    { label: "1A", value: "1y" },
    { label: "Tutto", value: "all" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
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
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showLastNight}
            onChange={(e) => setShowLastNight(e.target.checked)}
            className="rounded"
          />
          Last night
        </label>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
          Caricamento...
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
          Nessun dato nel periodo selezionato
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="calendarDate"
              tickFormatter={formatDate}
              tick={{ fontSize: 11 }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Events */}
            {visibleEvents.map((ev) => (
              <ReferenceArea
                key={ev._id}
                x1={ev.start_date}
                x2={ev.end_date}
                fill="rgba(251,146,60,0.15)"
                stroke="rgba(251,146,60,0.4)"
                strokeWidth={1}
                label={{ value: ev.description, position: "insideTopLeft", fontSize: 10, fill: "rgb(251,146,60)" }}
              />
            ))}
            {/* Baseline band */}
            <Area
              type="monotone"
              dataKey="baselineHigh"
              stroke="none"
              fill="rgba(16,185,129,0.15)"
              fillOpacity={1}
              dot={false}
              activeDot={false}
              connectNulls
              legendType="none"
            />
            <Area
              type="monotone"
              dataKey="baselineLow"
              stroke="none"
              fill="var(--background)"
              fillOpacity={1}
              dot={false}
              activeDot={false}
              connectNulls
              legendType="none"
            />
            {/* Weekly avg */}
            <Line
              type="monotone"
              dataKey="weeklyAvg"
              stroke="var(--chart-1)"
              strokeWidth={1.5}
              dot={(props) => <CustomDot {...props} data={chartData} />}
              activeDot={{ r: 5 }}
              connectNulls
            />
            {/* Last night avg */}
            {showLastNight && (
              <Line
                type="monotone"
                dataKey="lastNightAvg"
                stroke="var(--chart-4)"
                strokeWidth={1}
                dot={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* Import */}
      <div className="flex flex-col gap-2 mt-2">
        <p className="text-xs text-muted-foreground">
          Incolla JSON da{" "}
          <a
            href="https://connect.garmin.com/modern/report/-34/all/last_seven_days"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Garmin Connect
          </a>{" "}
          (formato <code>{"{ hrvSummaries: [...] }"}</code>)
        </p>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          placeholder='{ "hrvSummaries": [...] }'
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-y"
        />
        <button
          onClick={saveData}
          disabled={saving || !input.trim()}
          className="self-end rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {saving ? "Salvataggio..." : "Salva dati"}
        </button>
      </div>
    </div>
  );
}
