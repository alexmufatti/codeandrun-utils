"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import type { CalendarEvent } from "./HrvPageClient";

type RestHrEntry = {
  calendarDate: string;
  values: { restingHR: number };
  movingAvg?: number;
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
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-md text-sm space-y-1">
      <p className="font-medium">{label}</p>
      {payload[0] && <p>Rest HR: <span className="font-semibold">{payload[0].value}</span> bpm</p>}
      {payload[1] && <p className="text-muted-foreground">Media 5gg: {payload[1].value?.toFixed(1)}</p>}
    </div>
  );
}

export default function RestHrChart({ events }: { events: CalendarEvent[] }) {
  const [period, setPeriod] = useState<Period>("3m");
  const [data, setData] = useState<RestHrEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/resthr?from=${fromDate(p)}`);
      const raw: RestHrEntry[] = await res.json();
      const withAvg = raw.map((x, idx) => {
        const samples = Math.min(5, idx + 1);
        const avg =
          raw.slice(idx + 1 - samples, idx + 1).reduce((acc, v) => acc + v.values.restingHR, 0) /
          samples;
        return { ...x, movingAvg: Math.round(avg * 10) / 10 };
      });
      setData(withAvg);
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

  const firstDate = data[0]?.calendarDate ?? rangeStart;
  const lastDate = data[data.length - 1]?.calendarDate ?? rangeEnd;

  const allValues = data.flatMap((d) => [d.values.restingHR, d.movingAvg]).filter((v): v is number => v != null);
  const yMin = allValues.length ? Math.floor(Math.min(...allValues)) - 2 : 30;
  const yMax = allValues.length ? Math.ceil(Math.max(...allValues)) + 2 : 80;

  const saveData = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      toast.error("JSON non valido");
      return;
    }
    if (!Array.isArray(parsed) || !parsed.every((x: any) => x.calendarDate)) {
      toast.error("Formato non riconosciuto: atteso array con calendarDate");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/resthr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
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
      {/* Period selector */}
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
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
              unit=" bpm"
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Events */}
            {visibleEvents.map((ev) => (
              <ReferenceArea
                key={ev._id}
                x1={ev.start_date < firstDate ? firstDate : ev.start_date}
                x2={ev.end_date > lastDate ? lastDate : ev.end_date}
                fill="rgba(251,146,60,0.15)"
                stroke="rgba(251,146,60,0.4)"
                strokeWidth={1}
                label={{ value: ev.description, position: "insideTopLeft", fontSize: 10, fill: "rgb(251,146,60)" }}
              />
            ))}
            <Line
              type="monotone"
              dataKey="values.restingHR"
              stroke="var(--chart-1)"
              strokeWidth={1}
              dot={{ r: 2, fill: "var(--chart-1)" }}
              activeDot={{ r: 4 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="movingAvg"
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* Import */}
      <div className="flex flex-col gap-2 mt-2">
        <p className="text-xs text-muted-foreground">
          Incolla JSON da{" "}
          <a
            href="https://connect.garmin.com/modern/report/60/wellness/last_seven_days"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Garmin Connect
          </a>{" "}
          (formato array con <code>calendarDate</code> e <code>values.restingHR</code>)
        </p>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          placeholder='[{ "calendarDate": "2024-01-01", "values": { "restingHR": 42 } }]'
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
