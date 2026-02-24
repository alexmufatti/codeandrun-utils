import type { WeightStats } from "@/types/weight";

interface DataPoint {
  date: string;
  weightKg: number;
}

/**
 * Linear regression slope over the dataset.
 * Returns positive value for rising, negative for falling.
 */
function linearRegressionSlope(data: DataPoint[]): number {
  const n = data.length;
  if (n < 2) return 0;

  // Use index as x to avoid timestamp scale issues
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;

  data.forEach((d, i) => {
    sumX += i;
    sumY += d.weightKg;
    sumXY += i * d.weightKg;
    sumXX += i * i;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return slope;
}

export function calculateStats(
  data: DataPoint[],
  targetWeightKg: number | null
): WeightStats {
  if (data.length === 0) {
    return {
      current: null,
      min: null,
      max: null,
      avg: null,
      trend: null,
      deltaFromTarget: null,
    };
  }

  // Data should be sorted ascending by date
  const sorted = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const weights = sorted.map((d) => d.weightKg);
  const current = weights[weights.length - 1];
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const avg = parseFloat(
    (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1)
  );

  const slope = linearRegressionSlope(sorted);
  let trend: WeightStats["trend"];
  if (Math.abs(slope) < 0.01) {
    trend = "stable";
  } else if (slope > 0) {
    trend = "rising";
  } else {
    trend = "falling";
  }

  const deltaFromTarget =
    targetWeightKg !== null
      ? parseFloat((current - targetWeightKg).toFixed(1))
      : null;

  return { current, min, max, avg, trend, deltaFromTarget };
}
