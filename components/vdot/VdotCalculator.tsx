"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import {
  calculateVdot,
  calculateZones,
  predictRaceTimes,
  formatPaceSec,
  formatTotalTime,
} from "@/lib/vdot/calculations";
import { parseTime } from "@/lib/pace/calculations";
import type { TrainingZone } from "@/types/vdot";

const PRESET_DISTANCES = [
  { label: "5K",       value: "5",       distanceM: 5000 },
  { label: "10K",      value: "10",      distanceM: 10000 },
  { label: "Mezza",    value: "21.0975", distanceM: 21097.5 },
  { label: "Maratona", value: "42.195",  distanceM: 42195 },
];

const ZONE_COLORS: Record<TrainingZone["id"], string> = {
  E: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  M: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  T: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  I: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  R: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
};

export default function VdotCalculator() {
  const { t } = useTranslations();
  const [distanceM, setDistanceM] = useState(5000);
  const [distanceLabel, setDistanceLabel] = useState("5K");
  const [timeInput, setTimeInput] = useState("");

  const ZONE_META: Record<TrainingZone["id"], { name: string; desc: string; intensity: string }> = {
    E: { name: t.vdot.zoneE, desc: t.vdot.descE, intensity: t.vdot.intensityE },
    M: { name: t.vdot.zoneM, desc: t.vdot.descM, intensity: t.vdot.intensityM },
    T: { name: t.vdot.zoneT, desc: t.vdot.descT, intensity: t.vdot.intensityT },
    I: { name: t.vdot.zoneI, desc: t.vdot.descI, intensity: t.vdot.intensityI },
    R: { name: t.vdot.zoneR, desc: t.vdot.descR, intensity: t.vdot.intensityR },
  };

  const vdot = useMemo(() => {
    const timeSec = parseTime(timeInput);
    if (!isFinite(timeSec) || timeSec <= 0) return null;
    const v = calculateVdot(distanceM, timeSec / 60);
    return isFinite(v) && v > 0 ? v : null;
  }, [distanceM, timeInput]);

  const zones = useMemo(() => (vdot ? calculateZones(vdot) : null), [vdot]);
  const predictions = useMemo(() => (vdot ? predictRaceTimes(vdot) : null), [vdot]);

  function selectPreset(preset: typeof PRESET_DISTANCES[number]) {
    setDistanceM(preset.distanceM);
    setDistanceLabel(preset.label);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Input card */}
      <Card>
        <CardHeader>
          <CardTitle>{t.vdot.pageTitle}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{t.vdot.pageSubtitle}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t.vdot.referenceRace}</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_DISTANCES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => selectPreset(p)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                    distanceLabel === p.label
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 max-w-xs">
            <Label>{t.vdot.raceTime}</Label>
            <Input
              placeholder={t.vdot.raceTimePlaceholder}
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              className="font-mono"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {vdot && zones && predictions && (
        <>
          {/* VDOT badge */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-4 shadow-sm">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                {t.vdot.yourVdot}
              </span>
              <span className="text-4xl font-bold tabular-nums mt-1">
                {vdot.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Training zones table */}
          <Card>
            <CardHeader>
              <CardTitle>{t.vdot.trainingZones}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground w-12">{t.vdot.zone}</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.vdot.description}</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t.vdot.pace}</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">{t.vdot.intensity}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zones.map((zone) => {
                      const meta = ZONE_META[zone.id];
                      const colorClass = ZONE_COLORS[zone.id];

                      const paceDisplay =
                        zone.paceRangeMinSec && zone.paceRangeMaxSec
                          ? `${formatPaceSec(zone.paceRangeMinSec)} – ${formatPaceSec(zone.paceRangeMaxSec)}`
                          : formatPaceSec(zone.paceSecPerKm);

                      return (
                        <tr key={zone.id} className="border-t border-border">
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex items-center justify-center w-8 h-8 rounded-full border text-xs font-bold", colorClass)}>
                              {zone.id}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{meta.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{meta.desc}</div>
                            {zone.repTimes && (
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                                {zone.repTimes.map((r) => (
                                  <span key={r.distance} className="text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">{r.distance}</span> {r.time}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold whitespace-nowrap">
                            {paceDisplay}
                            <span className="text-xs text-muted-foreground font-normal ml-1">/km</span>
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                            {meta.intensity}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Race predictions */}
          <Card>
            <CardHeader>
              <CardTitle>{t.vdot.predictedTimes}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {predictions.map((p) => (
                  <div key={p.label} className="flex flex-col items-center rounded-lg border border-border py-3 px-2 text-center">
                    <span className="text-xs text-muted-foreground">{p.label}</span>
                    <span className="font-mono font-semibold mt-1">{p.timeStr}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
