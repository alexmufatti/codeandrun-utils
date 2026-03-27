"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import type { PeriodDays } from "@/types/weight";

interface ChartDataPoint {
  date: string;
  weightKg: number;
}

function buildFullDateRange(
  data: ChartDataPoint[],
  period: PeriodDays
): { date: string; weightKg: number | null }[] {
  const byDate = new Map(data.map((d) => [d.date, d.weightKg]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result: { date: string; weightKg: number | null }[] = [];
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    result.push({ date: iso, weightKg: byDate.get(iso) ?? null });
  }
  return result;
}

interface WeightChartProps {
  data: ChartDataPoint[];
  targetWeightKg: number | null;
  period: PeriodDays;
  onPeriodChange: (p: PeriodDays) => void;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year?.slice(2)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length && payload[0].value !== null) {
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-md text-sm">
        <p className="font-medium">{formatDate(label)}</p>
        <p className="text-[var(--run-accent)] font-semibold">{payload[0].value} kg</p>
      </div>
    );
  }
  return null;
}

export default function WeightChart({
  data,
  targetWeightKg,
  period,
  onPeriodChange,
}: WeightChartProps) {
  const { t } = useTranslations();

  const PERIODS: { label: string; value: PeriodDays }[] = [
    { label: t.weight.period30, value: 30 },
    { label: t.weight.period90, value: 90 },
    { label: t.weight.period365, value: 365 },
  ];

  const chartData = buildFullDateRange(data, period);

  const weights = data.map((d) => d.weightKg);
  const minW = weights.length ? Math.min(...weights) : 50;
  const maxW = weights.length ? Math.max(...weights) : 100;
  const padding = 2;

  const yMin = Math.floor(Math.min(minW, targetWeightKg ?? minW) - padding);
  const yMax = Math.ceil(Math.max(maxW, targetWeightKg ?? maxW) + padding);

  return (
    <div className="flex flex-col gap-4">
      {/* Period selector */}
      <div className="flex gap-1.5">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriodChange(p.value)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              period === p.value
                ? "bg-[var(--run-accent)] text-white border-[var(--run-accent)]"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
          {t.weight.chartNoData}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--run-accent)" }}
              activeDot={{ r: 5, fill: "var(--run-accent)" }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
