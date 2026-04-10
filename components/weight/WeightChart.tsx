"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import type { CalendarEvent } from "@/app/dashboard/hrv/HrvPageClient";
import type { PeriodDays } from "@/types/weight";

interface ChartDataPoint {
  date: string;
  weightKg: number;
}

type FullDataPoint = { date: string; weightKg: number | null; movingAvg: number | null };

function buildFullDateRange(data: ChartDataPoint[], period: PeriodDays): FullDataPoint[] {
  const byDate = new Map(data.map((d) => [d.date, d.weightKg]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates: string[] = [];
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  }

  // Moving average: centered 7-day window (±3 days), only on days with actual data
  const HALF = 3;
  return dates.map((iso, i) => {
    const weightKg = byDate.get(iso) ?? null;

    const neighbours: number[] = [];
    for (let j = i - HALF; j <= i + HALF; j++) {
      if (j >= 0 && j < dates.length) {
        const v = byDate.get(dates[j]);
        if (v !== undefined) neighbours.push(v);
      }
    }
    const movingAvg =
      neighbours.length >= 2
        ? Math.round((neighbours.reduce((s, v) => s + v, 0) / neighbours.length) * 10) / 10
        : null;

    return { date: iso, weightKg, movingAvg };
  });
}

interface WeightChartProps {
  data: ChartDataPoint[];
  targetWeightKg: number | null;
  period: PeriodDays;
  events?: CalendarEvent[];
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year?.slice(2)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const actual = payload.find((p: any) => p.dataKey === "weightKg" && p.value !== null);
  const avg = payload.find((p: any) => p.dataKey === "movingAvg" && p.value !== null);
  if (!actual && !avg) return null;
  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-md text-sm flex flex-col gap-1">
      <p className="font-medium">{formatDate(label)}</p>
      {actual && (
        <p className="text-[var(--run-accent)] font-semibold">{actual.value} kg</p>
      )}
      {avg && (
        <p className="text-muted-foreground text-xs">media mobile: {avg.value} kg</p>
      )}
    </div>
  );
}

export default function WeightChart({
  data,
  targetWeightKg,
  period,
  events = [],
}: WeightChartProps) {
  const { t } = useTranslations();

  const chartData = buildFullDateRange(data, period);

  const firstDate = chartData[0]?.date ?? "";
  const lastDate = chartData[chartData.length - 1]?.date ?? "";

  const visibleEvents = events.filter(
    (ev) => ev.start_date <= lastDate && ev.end_date >= firstDate
  );

  const weights = data.map((d) => d.weightKg);
  const minW = weights.length ? Math.min(...weights) : 50;
  const maxW = weights.length ? Math.max(...weights) : 100;
  const padding = 2;

  const yMin = Math.floor(Math.min(minW, targetWeightKg ?? minW) - padding);
  const yMax = Math.ceil(Math.max(maxW, targetWeightKg ?? maxW) + padding);

  return (
    <div className="flex flex-col gap-4">
      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
          {t.weight.chartNoData}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
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
              unit=" kg"
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Events */}
            {visibleEvents.map((ev) =>
              ev.start_date === ev.end_date ? (
                <ReferenceLine
                  key={ev._id}
                  x={ev.start_date < firstDate ? firstDate : ev.start_date}
                  stroke="rgba(251,146,60,0.7)"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  label={{ value: ev.description, position: "insideTopLeft", fontSize: 10, fill: "rgb(251,146,60)" }}
                />
              ) : (
                <ReferenceArea
                  key={ev._id}
                  x1={ev.start_date < firstDate ? firstDate : ev.start_date}
                  x2={ev.end_date > lastDate ? lastDate : ev.end_date}
                  fill="rgba(251,146,60,0.15)"
                  stroke="rgba(251,146,60,0.4)"
                  strokeWidth={1}
                  label={{ value: ev.description, position: "insideTopLeft", fontSize: 10, fill: "rgb(251,146,60)" }}
                />
              )
            )}
            {targetWeightKg !== null && (
              <ReferenceLine
                y={targetWeightKg}
                stroke="var(--chart-2)"
                strokeDasharray="6 3"
                label={{
                  value: `${t.weight.chartTarget}: ${targetWeightKg} kg`,
                  position: "insideTopRight",
                  fontSize: 11,
                  fill: "var(--chart-2)",
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="weightKg"
              stroke="var(--run-accent)"
              strokeWidth={1.5}
              strokeOpacity={0.5}
              dot={{ r: 2.5, fill: "var(--run-accent)", fillOpacity: 0.5 }}
              activeDot={{ r: 4, fill: "var(--run-accent)" }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="movingAvg"
              stroke="var(--run-accent)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "var(--run-accent)" }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
