"use client";

import { useState, useEffect, useCallback } from "react";
import PersonalRecordsManager from "./PersonalRecordsManager";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type MonthStat = {
  _id: { year: number; month: number; week: number };
  total_distance: number;
  elevation: number;
  total_moving: number;
  count: number;
};

type KudosStat = { year: number; kudos: number };

type YearTotal = {
  year: number;
  total_distance: number;
  elevation: number;
  count: number;
  total_moving: number;
  kudos: number;
};

type WeeklyStreak = {
  longestStreak: number;
  longestStartDate: string | null;
  longestEndDate: string | null;
  currentStreak: number;
  currentStartDate: string | null;
};

type DayOfWeekStat = {
  day: string;
  count: number;
  totalDistance: number;
  avgDistance: number;
};

type TopRun = {
  id: number;
  name: string;
  start_date: string;
  distance: number;
  total_elevation_gain: number;
  average_speed: number;
  moving_time: number;
};

type Metric = "total_distance" | "elevation" | "count";

// ─── Constants ────────────────────────────────────────────────────────────────

const METRIC_LABELS: Record<Metric, string> = {
  total_distance: "Distanza",
  elevation: "Dislivello",
  count: "Attività",
};

const MONTHS = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
];

const YEAR_COLORS = [
  "#FC4C02", "#1E3A8A", "#10B981", "#3B82F6", "#FF7A3D", "#6366F1", "#F59E0B",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoving(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatPaceFromTime(distanceMeters: number, seconds: number): string {
  const paceSecPerKm = (seconds / distanceMeters) * 1000;
  const pm = Math.floor(paceSecPerKm / 60);
  const ps = Math.round(paceSecPerKm % 60);
  return `${pm}:${String(ps).padStart(2, "0")} /km`;
}

function computeYearTotals(
  monthlyData: MonthStat[],
  kudosData: KudosStat[]
): YearTotal[] {
  const map = new Map<number, Omit<YearTotal, "year" | "kudos">>();
  for (const d of monthlyData) {
    const y = d._id.year;
    const cur = map.get(y) ?? { total_distance: 0, elevation: 0, count: 0, total_moving: 0 };
    map.set(y, {
      total_distance: cur.total_distance + d.total_distance,
      elevation: cur.elevation + d.elevation,
      count: cur.count + d.count,
      total_moving: cur.total_moving + d.total_moving,
    });
  }
  return [...map.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, totals]) => ({
      year,
      ...totals,
      kudos: kudosData.find((k) => k.year === year)?.kudos ?? 0,
    }));
}

function buildChartData(monthlyData: MonthStat[], metric: Metric) {
  const years = [...new Set(monthlyData.map((d) => d._id.year))].sort();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const rows = MONTHS.map((monthName, i) => {
    const monthNum = i + 1;
    const row: Record<string, string | number | null> = { month: monthName };
    for (const year of years) {
      if (year === currentYear && monthNum >= currentMonth) {
        row[String(year)] = null;
      } else {
        const cumulative = monthlyData
          .filter((d) => d._id.year === year && d._id.month <= monthNum)
          .reduce((acc, d) => {
            if (metric === "total_distance") return acc + d.total_distance / 1000;
            if (metric === "elevation") return acc + d.elevation;
            return acc + d.count;
          }, 0);
        row[String(year)] =
          metric === "total_distance"
            ? Math.round(cumulative * 10) / 10
            : Math.round(cumulative);
      }
    }
    return row;
  });

  return { years, rows };
}

function buildMarkdownTable(yearTotals: YearTotal[], lastUpdate: string | null): string {
  const lines = [
    "| Anno | Distanza | Dislivello | Attività |    Tempo |    Kudos |",
    "|------|----------|------------|----------|----------|----------|",
    ...yearTotals.map(
      (y) =>
        `| ${y.year} | ${(y.total_distance / 1000).toFixed(0).padStart(5)} km | ${y.elevation
          .toFixed(0)
          .padStart(8)} m | ${String(y.count).padStart(8)} | ${formatMoving(y.total_moving)} | ${String(
          y.kudos
        ).padStart(8)} |`
    ),
    "",
    lastUpdate
      ? `_Aggiornato il ${new Date(lastUpdate).toLocaleDateString("it-IT")} alle ${new Date(
          lastUpdate
        ).toLocaleTimeString("it-IT")}_`
      : "",
  ];
  return lines.join("\n");
}

function buildChartCsvData(monthlyData: MonthStat[]): string {
  const years = [...new Set(monthlyData.map((d) => d._id.year))].sort();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const header = `x,${years.join(",")}\nstring,${years.map(() => "number").join(",")}`;
  const dataRows = MONTHS.map((monthName, i) => {
    const monthNum = i + 1;
    const values = years.map((year) => {
      if (year === currentYear && monthNum >= currentMonth) return "";
      const cumulative = monthlyData
        .filter((d) => d._id.year === year && d._id.month <= monthNum)
        .reduce((acc, d) => acc + d.total_distance / 1000, 0);
      return cumulative > 0 ? cumulative.toFixed(1) : "0";
    });
    return `${monthName},${values.join(",")}`;
  });

  return `${header}\n${dataRows.join("\n")}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function YearTable({
  yearTotals,
  lastUpdate,
  onCopy,
}: {
  yearTotals: YearTotal[];
  lastUpdate: string | null;
  onCopy: (text: string) => void;
}) {
  const currentYear = new Date().getFullYear();
  const maxDist = Math.max(...yearTotals.map((y) => y.total_distance));

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold">Totali per anno</h2>
        <button
          onClick={() => onCopy(buildMarkdownTable(yearTotals, lastUpdate))}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Copia markdown
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
              <th className="px-5 py-3 text-left font-medium">Anno</th>
              <th className="px-5 py-3 text-right font-medium">Distanza</th>
              <th className="px-5 py-3 text-right font-medium hidden sm:table-cell">Dislivello</th>
              <th className="px-5 py-3 text-right font-medium hidden sm:table-cell">Attività</th>
              <th className="px-5 py-3 text-right font-medium hidden md:table-cell">Tempo</th>
              <th className="px-5 py-3 text-right font-medium hidden md:table-cell">Kudos</th>
            </tr>
          </thead>
          <tbody>
            {yearTotals.map((y) => {
              const isCurrentYear = y.year === currentYear;
              const barPct = Math.round((y.total_distance / maxDist) * 100);
              return (
                <tr
                  key={y.year}
                  className="border-t border-border/60 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center gap-2 font-bold text-base ${
                        isCurrentYear ? "text-[#FC4C02]" : ""
                      }`}
                    >
                      {y.year}
                      {isCurrentYear && (
                        <span className="text-[10px] font-semibold bg-[#FC4C02]/10 text-[#FC4C02] px-1.5 py-0.5 rounded-full leading-none">
                          in corso
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-semibold tabular-nums">
                        {(y.total_distance / 1000).toFixed(0)}{" "}
                        <span className="text-muted-foreground font-normal text-xs">km</span>
                      </span>
                      <div className="w-24 h-1 rounded-full bg-muted overflow-hidden hidden sm:block">
                        <div
                          className="h-full rounded-full bg-[#FC4C02]/70"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums hidden sm:table-cell">
                    {y.elevation.toFixed(0)}{" "}
                    <span className="text-muted-foreground text-xs">m</span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums hidden sm:table-cell">
                    {y.count}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                    {formatMoving(y.total_moving)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                    {y.kudos}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StatsClient({ isWpUser }: { isWpUser: boolean }) {
  const [monthlyData, setMonthlyData] = useState<MonthStat[]>([]);
  const [kudosData, setKudosData] = useState<KudosStat[]>([]);
  const [weeklyStreak, setWeeklyStreak] = useState<WeeklyStreak | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeekStat[]>([]);
  const [topRuns, setTopRuns] = useState<TopRun[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<Metric>("total_distance");
  const [publishing, setPublishing] = useState(false);
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, kudosRes, streakRes, dowRes, topRes] = await Promise.all([
        fetch("/api/strava/stats"),
        fetch("/api/strava/stats/kudos"),
        fetch("/api/strava/stats/weekly-streak"),
        fetch("/api/strava/stats/day-of-week"),
        fetch("/api/strava/stats/top-runs"),
      ]);
      const [stats, kudos, streak, dow, top] = await Promise.all([
        statsRes.json(),
        kudosRes.json(),
        streakRes.json(),
        dowRes.json(),
        topRes.json(),
      ]);
      setMonthlyData(stats.data ?? []);
      setLastUpdate(stats.lastUpdate ?? null);
      const allYears = [...new Set((stats.data ?? []).map((d: MonthStat) => d._id.year))].sort() as number[];
      setSelectedYears((prev) => (prev.size === 0 ? new Set(allYears.slice(-4)) : prev));
      setKudosData(kudos ?? []);
      setWeeklyStreak(streak);
      setDayOfWeek(dow ?? []);
      setTopRuns(top ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiato negli appunti");
  };

  const toggleYear = (year: number) => {
    setSelectedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        if (next.size > 1) next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch("/api/strava/stats/publish", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Pagina Running aggiornata!", {
        description: (
          <a
            href={data.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {data.pageUrl}
          </a>
        ) as any,
        duration: 8000,
      });
    } catch (err: any) {
      toast.error("Errore aggiornamento pagina", { description: err.message });
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-sm text-muted-foreground">Caricamento statistiche...</p>
      </main>
    );
  }

  if (!monthlyData.length) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-4">Statistiche Running</h1>
        <p className="text-sm text-muted-foreground">
          Nessuna attività trovata. Sincronizza le attività da Strava prima.
        </p>
      </main>
    );
  }

  const yearTotals = computeYearTotals(monthlyData, kudosData);
  const { years, rows: chartRows } = buildChartData(monthlyData, metric);
  const chartCsv = buildChartCsvData(monthlyData);
  const favoriteDay = dayOfWeek.length
    ? dayOfWeek.reduce((max, d) => (d.count > max.count ? d : max), dayOfWeek[0])
    : null;

  const visibleYears = years.filter((y) => selectedYears.has(y));
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const forecastKey = `${currentYear}_forecast`;
  const showForecast = visibleYears.includes(currentYear) && currentMonth < 12;

  let forecastRows = chartRows;
  if (showForecast) {
    const currentYearData = monthlyData.filter(
      (d) => d._id.year === currentYear && d._id.month <= currentMonth
    );
    const totalSoFar = currentYearData.reduce((acc, d) => {
      if (metric === "total_distance") return acc + d.total_distance / 1000;
      if (metric === "elevation") return acc + d.elevation;
      return acc + d.count;
    }, 0);
    const avgMonthly = currentMonth > 0 ? totalSoFar / currentMonth : 0;
    forecastRows = chartRows.map((row, i) => {
      const monthNum = i + 1;
      if (monthNum < currentMonth) return { ...row, [forecastKey]: null };
      const projected = totalSoFar + (monthNum - currentMonth) * avgMonthly;
      return {
        ...row,
        [forecastKey]:
          metric === "total_distance"
            ? Math.round(projected * 10) / 10
            : Math.round(projected),
      };
    });
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Statistiche Running</h1>
          {lastUpdate && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Ultimo aggiornamento:{" "}
              {new Date(lastUpdate).toLocaleDateString("it-IT", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          )}
        </div>
        {isWpUser && (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="rounded-md bg-[#FC4C02] px-4 py-2 text-sm font-medium text-white hover:bg-[#e04400] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {publishing ? "Pubblicazione..." : "Aggiorna pagina Running →"}
          </button>
        )}
      </div>

      {/* Record personali */}
      <PersonalRecordsManager />

      {/* Grafico cumulativo */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
          <h2 className="text-base font-semibold">Progressione cumulativa</h2>
          <div className="flex gap-1.5">
            {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  metric === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                {METRIC_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
        {/* Selettore anni */}
        <div className="flex gap-2 flex-wrap mb-4">
          {years.map((year, i) => {
            const color = YEAR_COLORS[i % YEAR_COLORS.length];
            const isSelected = selectedYears.has(year);
            return (
              <button
                key={year}
                onClick={() => toggleYear(year)}
                className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                style={
                  isSelected
                    ? { backgroundColor: color, borderColor: color, color: "#fff" }
                    : { borderColor: color, color: color, backgroundColor: "transparent" }
                }
              >
                {year}
              </button>
            );
          })}
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={forecastRows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
            <Legend />
            {years.map((year, i) =>
              visibleYears.includes(year) ? (
                <Line
                  key={year}
                  type="monotone"
                  dataKey={String(year)}
                  stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              ) : null
            )}
            {showForecast && (() => {
              const i = years.indexOf(currentYear);
              return (
                <Line
                  key={forecastKey}
                  type="monotone"
                  dataKey={forecastKey}
                  name={`${currentYear} (prev.)`}
                  stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  connectNulls={false}
                />
              );
            })()}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabella anno per anno */}
      <YearTable yearTotals={yearTotals} lastUpdate={lastUpdate} onCopy={copyText} />

      {/* Dati Google Charts */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Dati Google Charts</h2>
          <button
            onClick={() => copyText(chartCsv)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Copia CSV
          </button>
        </div>
        <pre className="text-xs font-mono bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre max-h-44">
          {chartCsv}
        </pre>
      </div>

      {/* Streak settimanale */}
      {weeklyStreak && (weeklyStreak.longestStreak > 0 || weeklyStreak.currentStreak > 0) && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold mb-4">Streak settimanale</h2>
          <div className="flex gap-8 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Serie più lunga</p>
              <p className="text-3xl font-bold tabular-nums">{weeklyStreak.longestStreak}</p>
              <p className="text-xs text-muted-foreground mt-0.5">settimane consecutive</p>
              {weeklyStreak.longestStartDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  {weeklyStreak.longestStartDate} → {weeklyStreak.longestEndDate}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Serie corrente</p>
              <p className="text-3xl font-bold tabular-nums text-[#FC4C02]">
                {weeklyStreak.currentStreak}
                {weeklyStreak.currentStreak > 0 &&
                  weeklyStreak.currentStreak === weeklyStreak.longestStreak && (
                    <span className="text-xl ml-1">🔥</span>
                  )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">settimane consecutive</p>
              {weeklyStreak.currentStartDate && weeklyStreak.currentStreak > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  dal {weeklyStreak.currentStartDate}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pattern per giorno */}
      {dayOfWeek.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold">
              Pattern settimanale
              {favoriteDay && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  — preferito:{" "}
                  <strong className="text-foreground">{favoriteDay.day}</strong>
                </span>
              )}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
                  <th className="px-5 py-3 text-left font-medium">Giorno</th>
                  <th className="px-5 py-3 text-right font-medium">Corse</th>
                  <th className="px-5 py-3 text-right font-medium hidden sm:table-cell">
                    Distanza tot.
                  </th>
                  <th className="px-5 py-3 text-right font-medium hidden sm:table-cell">
                    Media/corsa
                  </th>
                </tr>
              </thead>
              <tbody>
                {dayOfWeek.map((d, i) => (
                  <tr
                    key={d.day}
                    className={`border-t border-border/60 hover:bg-muted/30 transition-colors ${
                      d.day === favoriteDay?.day ? "bg-[#FC4C02]/5" : ""
                    }`}
                  >
                    <td className="px-5 py-2.5 font-medium">{d.day}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums">{d.count}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums hidden sm:table-cell">
                      {(d.totalDistance / 1000).toFixed(1)} km
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                      {(d.avgDistance / 1000).toFixed(1)} km
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top 5 corse */}
      {topRuns.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold">Top 5 corse per distanza</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
                  <th className="px-5 py-3 text-left font-medium">#</th>
                  <th className="px-5 py-3 text-left font-medium">Nome</th>
                  <th className="px-5 py-3 text-right font-medium">Distanza</th>
                  <th className="px-5 py-3 text-right font-medium hidden sm:table-cell">
                    Dislivello
                  </th>
                  <th className="px-5 py-3 text-right font-medium hidden md:table-cell">Data</th>
                </tr>
              </thead>
              <tbody>
                {topRuns.map((run, i) => (
                  <tr
                    key={run.id}
                    className="border-t border-border/60 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-2.5 text-muted-foreground font-medium">{i + 1}</td>
                    <td className="px-5 py-2.5 font-medium">{run.name}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums font-semibold">
                      {(run.distance / 1000).toFixed(2)}{" "}
                      <span className="text-muted-foreground font-normal text-xs">km</span>
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                      {run.total_elevation_gain.toFixed(0)} m
                    </td>
                    <td className="px-5 py-2.5 text-right text-muted-foreground hidden md:table-cell">
                      {new Date(run.start_date).toLocaleDateString("it-IT", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
