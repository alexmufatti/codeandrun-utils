"use client";

import { useState, useEffect, useCallback } from "react";
import WeightForm from "@/components/weight/WeightForm";
import WeightChart from "@/components/weight/WeightChart";
import WeightStats from "@/components/weight/WeightStats";
import WeightTarget from "@/components/weight/WeightTarget";
import WeightImport from "@/components/weight/WeightImport";
import { calculateStats } from "@/lib/weight/calculations";
import type { PeriodDays, WeightEntry } from "@/types/weight";

export default function WeightDashboardPage() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [targetWeightKg, setTargetWeightKg] = useState<number | null>(null);
  const [period, setPeriod] = useState<PeriodDays>(30);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesRes, settingsRes] = await Promise.all([
        fetch(`/api/weight?days=${period}`),
        fetch("/api/weight/settings"),
      ]);

      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setEntries(data);
      }
      if (settingsRes.ok) {
        const settings = await settingsRes.json();
        setTargetWeightKg(settings.targetWeightKg);
      }
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = calculateStats(
    entries.map((e) => ({ date: e.date, weightKg: e.weightKg })),
    targetWeightKg
  );

  return (
    <>
      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Stats row */}
        {!loading && <WeightStats stats={stats} />}

        {/* Chart */}
        <div className="border border-border rounded-xl p-6">
          <h2 className="text-base font-semibold mb-4">Andamento del peso</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              Caricamento...
            </div>
          ) : (
            <WeightChart
              data={entries.map((e) => ({ date: e.date, weightKg: e.weightKg }))}
              targetWeightKg={targetWeightKg}
              period={period}
              onPeriodChange={(p) => setPeriod(p)}
            />
          )}
        </div>

        {/* Forms row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <WeightForm onSuccess={fetchData} />
          <WeightTarget
            currentTarget={targetWeightKg}
            onSuccess={(t) => {
              setTargetWeightKg(t);
            }}
          />
        </div>

        {/* CSV Import */}
        <WeightImport onSuccess={fetchData} />
      </main>
    </>
  );
}
