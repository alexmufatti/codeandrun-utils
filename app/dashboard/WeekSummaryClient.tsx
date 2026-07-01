"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TrendingDown, TrendingUp, Minus, Heart, Moon, Activity, Scale, Zap } from "lucide-react";

type WeekSummary = {
  weight: {
    latest: { date: string; weightKg: number } | null;
    delta: number | null;
    entriesCount: number;
  };
  hrv: {
    avg: number | null;
    latestStatus: string | null;
    latestLastNight: number | null;
    latestDate: string | null;
    entriesCount: number;
  };
  resthr: {
    avg: number | null;
    entriesCount: number;
  };
  sleep: {
    avgSeconds: number | null;
    avgScore: number | null;
    entriesCount: number;
  };
  strava: {
    activities: {
      id: number;
      name: string;
      sport_type: string;
      distance: number;
      moving_time: number;
      start_date_local: string;
      total_elevation_gain: number;
    }[];
    totalDistance: number;
    totalMovingTime: number;
    count: number;
    runCount: number;
  };
};

function formatPace(distanceM: number, timeS: number): string {
  if (!distanceM || !timeS) return "-";
  const paceSecPerKm = timeS / (distanceM / 1000);
  const min = Math.floor(paceSecPerKm / 60);
  const sec = Math.round(paceSecPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")} /km`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatSleepHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
}

function SportIcon({ type }: { type: string }) {
  if (type === "Run" || type === "TrailRun" || type === "VirtualRun")
    return <span className="text-base">🏃</span>;
  if (type === "Ride" || type === "VirtualRide") return <span className="text-base">🚴</span>;
  if (type === "Swim") return <span className="text-base">🏊</span>;
  if (type === "Walk") return <span className="text-base">🚶</span>;
  if (type === "Hike") return <span className="text-base">🥾</span>;
  if (type === "WeightTraining" || type === "Workout") return <span className="text-base">💪</span>;
  return <span className="text-base">⚡</span>;
}

function WeightDelta({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-muted-foreground text-xs">n/d</span>;
  const abs = Math.abs(delta).toFixed(1);
  if (Math.abs(delta) < 0.05)
    return (
      <span className="flex items-center gap-1 text-muted-foreground text-xs">
        <Minus className="h-3 w-3" /> Stabile
      </span>
    );
  if (delta < 0)
    return (
      <span className="flex items-center gap-1 text-emerald-500 text-xs font-medium">
        <TrendingDown className="h-3 w-3" /> -{abs} kg
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-orange-500 text-xs font-medium">
      <TrendingUp className="h-3 w-3" /> +{abs} kg
    </span>
  );
}

function StatCard({
  icon,
  title,
  value,
  unit,
  sub,
  href,
  noData,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | null;
  unit?: string;
  sub?: React.ReactNode;
  href: string;
  noData?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
        <span className="text-muted-foreground/60">{icon}</span>
      </div>
      {noData || value === null ? (
        <p className="text-sm text-muted-foreground">Nessun dato</p>
      ) : (
        <>
          <p className="text-2xl font-bold leading-none">
            {value}
            {unit && <span className="text-base font-normal text-muted-foreground ml-1">{unit}</span>}
          </p>
          {sub && <div>{sub}</div>}
        </>
      )}
    </Link>
  );
}

export default function WeekSummaryClient({
  apiBase = "/api",
  basePath = "/dashboard",
}: {
  apiBase?: string;
  basePath?: string;
}) {
  const [data, setData] = useState<WeekSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiBase}/summary/week`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [apiBase]);

  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);
  const periodLabel = `${weekAgo.toLocaleDateString("it-IT", { day: "numeric", month: "short" })} – ${today.toLocaleDateString("it-IT", { day: "numeric", month: "short" })}`;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Riepilogo settimanale</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{periodLabel}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          Caricamento...
        </div>
      ) : !data ? (
        <div className="text-sm text-muted-foreground">Errore nel caricamento dei dati.</div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Weight */}
            <StatCard
              icon={<Scale className="h-4 w-4" />}
              title="Peso"
              href={`${basePath}/weight`}
              value={data.weight.latest ? data.weight.latest.weightKg.toFixed(1) : null}
              unit="kg"
              sub={<WeightDelta delta={data.weight.delta} />}
              noData={!data.weight.latest}
            />

            {/* HRV */}
            <StatCard
              icon={<Zap className="h-4 w-4" />}
              title="HRV media"
              href={`${basePath}/hrv`}
              value={data.hrv.avg !== null ? String(data.hrv.avg) : null}
              unit="ms"
              sub={
                data.hrv.latestStatus ? (
                  <span className="text-xs text-muted-foreground capitalize">{data.hrv.latestStatus}</span>
                ) : undefined
              }
              noData={data.hrv.avg === null}
            />

            {/* Rest HR */}
            <StatCard
              icon={<Heart className="h-4 w-4" />}
              title="FC riposo"
              href={`${basePath}/hrv`}
              value={data.resthr.avg !== null ? String(data.resthr.avg) : null}
              unit="bpm"
              noData={data.resthr.avg === null}
            />

            {/* Sleep */}
            <StatCard
              icon={<Moon className="h-4 w-4" />}
              title="Sonno medio"
              href={`${basePath}/sleep`}
              value={data.sleep.avgSeconds !== null ? formatSleepHours(data.sleep.avgSeconds) : null}
              sub={
                data.sleep.avgScore !== null ? (
                  <span className="text-xs text-muted-foreground">Score {data.sleep.avgScore}</span>
                ) : undefined
              }
              noData={data.sleep.avgSeconds === null}
            />
          </div>

          {/* Strava section */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="h-[3px] bg-[#FC4C02]" />
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#FC4C02]" />
                  <h2 className="text-sm font-semibold">Attività Strava</h2>
                </div>
                <Link
                  href={`${basePath}/strava`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Vedi tutte →
                </Link>
              </div>

              {data.strava.count === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nessuna attività questa settimana.
                </p>
              ) : (
                <>
                  {/* Summary row */}
                  <div className="flex gap-6 py-2 border-b border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Attività</p>
                      <p className="text-lg font-bold">{data.strava.count}</p>
                    </div>
                    {data.strava.totalDistance > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">Distanza totale</p>
                        <p className="text-lg font-bold">
                          {(data.strava.totalDistance / 1000).toFixed(1)}{" "}
                          <span className="text-sm font-normal text-muted-foreground">km</span>
                        </p>
                      </div>
                    )}
                    {data.strava.totalMovingTime > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">Tempo totale</p>
                        <p className="text-lg font-bold">
                          {formatDuration(data.strava.totalMovingTime)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Activity list */}
                  <div className="flex flex-col gap-2">
                    {data.strava.activities.map((act) => (
                      <div
                        key={act.id}
                        className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0"
                      >
                        <SportIcon type={act.sport_type} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{act.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(act.start_date_local)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {act.distance > 0 && (
                            <p className="text-sm font-medium">
                              {(act.distance / 1000).toFixed(2)} km
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {act.moving_time > 0 ? formatDuration(act.moving_time) : ""}
                            {act.distance > 0 && act.moving_time > 0 && (
                              <span className="ml-2 text-muted-foreground/70">
                                {formatPace(act.distance, act.moving_time)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
