"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import type { WeightStats } from "@/types/weight";

interface WeightStatsProps {
  stats: WeightStats;
}

const TREND_COLORS: Record<NonNullable<WeightStats["trend"]>, string> = {
  rising: "text-red-500",
  stable: "text-yellow-500",
  falling: "text-green-500",
};

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          {label}
        </p>
        <p className={`text-xl font-semibold ${className ?? ""}`}>
          {value ?? "—"}
        </p>
      </CardContent>
    </Card>
  );
}

export default function WeightStatsComponent({ stats }: WeightStatsProps) {
  const { t } = useTranslations();
  const { current, min, max, avg, trend, deltaFromTarget } = stats;

  const TREND_LABELS: Record<NonNullable<WeightStats["trend"]>, string> = {
    rising: t.weight.trendRising,
    stable: t.weight.trendStable,
    falling: t.weight.trendFalling,
  };

  const trendLabel = trend ? TREND_LABELS[trend] : null;
  const trendColor = trend ? TREND_COLORS[trend] : "";

  const deltaLabel =
    deltaFromTarget !== null
      ? `${deltaFromTarget > 0 ? "+" : ""}${deltaFromTarget} kg`
      : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard label={t.weight.statCurrent} value={current !== null ? `${current} kg` : null} />
      <StatCard label={t.weight.statMin} value={min !== null ? `${min} kg` : null} />
      <StatCard label={t.weight.statMax} value={max !== null ? `${max} kg` : null} />
      <StatCard label={t.weight.statAvg} value={avg !== null ? `${avg} kg` : null} />
      <StatCard label={t.weight.statTrend} value={trendLabel} className={trendColor} />
      <StatCard
        label={t.weight.statTargetDelta}
        value={deltaLabel}
        className={
          deltaFromTarget !== null
            ? deltaFromTarget > 0
              ? "text-red-500"
              : deltaFromTarget < 0
              ? "text-green-500"
              : "text-muted-foreground"
            : ""
        }
      />
    </div>
  );
}
