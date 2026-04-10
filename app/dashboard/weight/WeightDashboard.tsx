"use client";

import { useState, useEffect, useCallback } from "react";
import WeightForm from "@/components/weight/WeightForm";
import WeightChart from "@/components/weight/WeightChart";
import WeightStats from "@/components/weight/WeightStats";
import WeightTarget from "@/components/weight/WeightTarget";
import WeightImport from "@/components/weight/WeightImport";
import { calculateStats } from "@/lib/weight/calculations";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import type { CalendarEvent } from "@/app/dashboard/hrv/HrvPageClient";
import type { PeriodDays, WeightEntry } from "@/types/weight";

export default function WeightDashboard() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [targetWeightKg, setTargetWeightKg] = useState<number | null>(null);
  const [period, setPeriod] = useState<PeriodDays>(30);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const { t } = useTranslations();

  const PERIODS: { label: string; value: PeriodDays }[] = [
    { label: t.weight.period30, value: 30 },
    { label: t.weight.period90, value: 90 },
    { label: t.weight.period365, value: 365 },
  ];

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

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.ok ? r.json() : [])
      .then(setEvents)
      .catch(() => {});
  }, []);

  const stats = calculateStats(
    entries.map((e) => ({ date: e.date, weightKg: e.weightKg })),
    targetWeightKg
  );

  return (
    <>
      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Period selector — filters both stats and chart */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-medium">Periodo:</span>
          <div className="flex gap-1.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
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
        </div>

        {/* Stats row */}
        {!loading && <WeightStats stats={stats} />}

        {/* Chart */}
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="h-[3px] bg-[var(--run-accent)]" />
          <div className="p-6">
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
                events={events}
              />
            )}
          </div>
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
