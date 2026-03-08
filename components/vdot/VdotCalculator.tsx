"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import {
  calculateVdot,
  calculateZones,
  predictRaceTimes,
  formatPaceSec,
} from "@/lib/vdot/calculations";
import { parseTime } from "@/lib/pace/calculations";
import type { TrainingZone, RacePrediction } from "@/types/vdot";

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
  const [saving, setSaving] = useState(false);

  const [vdot, setVdot] = useState<number | null>(null);
  const [zones, setZones] = useState<TrainingZone[] | null>(null);
  const [predictions, setPredictions] = useState<RacePrediction[] | null>(null);

  const ZONE_META: Record<TrainingZone["id"], { name: string; desc: string; intensity: string }> = {
    E: { name: t.vdot.zoneE, desc: t.vdot.descE, intensity: t.vdot.intensityE },
    M: { name: t.vdot.zoneM, desc: t.vdot.descM, intensity: t.vdot.intensityM },
    T: { name: t.vdot.zoneT, desc: t.vdot.descT, intensity: t.vdot.intensityT },
    I: { name: t.vdot.zoneI, desc: t.vdot.descI, intensity: t.vdot.intensityI },
    R: { name: t.vdot.zoneR, desc: t.vdot.descR, intensity: t.vdot.intensityR },
  };

  useEffect(() => {
    fetch("/api/vdot/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.vdotDistanceM) {
          const preset = PRESET_DISTANCES.find((p) => p.distanceM === data.vdotDistanceM);
          if (preset) { setDistanceM(preset.distanceM); setDistanceLabel(preset.label); }
        }
        if (data?.vdotTimeInput) setTimeInput(data.vdotTimeInput);
      })
      .catch(() => {});
  }, []);

  function selectPreset(preset: typeof PRESET_DISTANCES[number]) {
    setDistanceM(preset.distanceM);
    setDistanceLabel(preset.label);
    setVdot(null); setZones(null); setPredictions(null);
  }

  function handleTimeChange(value: string) {
    setTimeInput(value);
    setVdot(null); setZones(null); setPredictions(null);
  }

  async function handleCalculate() {
    const timeSec = parseTime(timeInput);
    if (!isFinite(timeSec) || timeSec <= 0) return;
    const v = calculateVdot(distanceM, timeSec / 60);
    if (!isFinite(v) || v <= 0) return;

    setVdot(v);
    setZones(calculateZones(v));
    setPredictions(predictRaceTimes(v));

    setSaving(true);
    try {
      await fetch("/api/vdot/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vdotDistanceM: distanceM, vdotTimeInput: timeInput }),
      });
    } finally {
      setSaving(false);
    }
  }

  const timeSec = parseTime(timeInput);
  const canCalculate = isFinite(timeSec) && timeSec > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Input card */}
      <Card className="overflow-hidden">
        <div className="h-[3px] bg-[var(--run-accent)]" />
        <CardHeader>
          <CardTitle>{t.vdot.pageTitle}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{t.vdot.pageSubtitle}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t.vdot.referenceRace}
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_DISTANCES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => selectPreset(p)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold border transition-colors",
                    distanceLabel === p.label
                      ? "bg-[var(--run-accent)] text-white border-[var(--run-accent)]"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 max-w-xs">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t.vdot.raceTime}
            </Label>
            <Input
              placeholder={t.vdot.raceTimePlaceholder}
              value={timeInput}
              onChange={(e) => handleTimeChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canCalculate && handleCalculate()}
              className="font-mono h-10"
            />
          </div>

          <Button
            onClick={handleCalculate}
            disabled={!canCalculate || saving}
            className={cn(
              "self-start transition-colors",
              canCalculate && !saving
                ? "bg-[var(--run-accent)] hover:bg-[var(--run-accent)]/90 border-[var(--run-accent)] text-white"
                : ""
            )}
          >
            {saving ? t.vdot.calculatingBtn : t.vdot.calculateBtn}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {vdot && zones && predictions && (
        <>
          {/* VDOT readout */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-[var(--run-accent)] bg-[var(--run-accent-muted)] px-8 py-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t.vdot.yourVdot}
              </span>
              <span className="text-5xl font-bold font-mono tabular-nums text-[var(--run-accent)] mt-1">
                {vdot.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Training zones */}
          <Card className="overflow-hidden">
            <div className="h-[3px] bg-[var(--run-accent)]" />
            <CardHeader>
              <CardTitle>{t.vdot.trainingZones}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">{t.vdot.zone}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.vdot.description}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.vdot.pace}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">{t.vdot.intensity}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zones.map((zone, i) => {
                      const meta = ZONE_META[zone.id];
                      const colorClass = ZONE_COLORS[zone.id];
                      const paceDisplay =
                        zone.paceRangeMinSec && zone.paceRangeMaxSec
                          ? `${formatPaceSec(zone.paceRangeMinSec)} – ${formatPaceSec(zone.paceRangeMaxSec)}`
                          : formatPaceSec(zone.paceSecPerKm);
                      return (
                        <tr key={zone.id} className={cn("border-t border-border", i % 2 === 1 && "bg-muted/20")}>
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
          <Card className="overflow-hidden">
            <div className="h-[3px] bg-[var(--run-accent)]" />
            <CardHeader>
              <CardTitle>{t.vdot.predictedTimes}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {predictions.map((p) => (
                  <div key={p.label} className="flex flex-col items-center rounded-lg border border-border py-3 px-2 text-center hover:border-[var(--run-accent)]/40 hover:bg-[var(--run-accent-muted)] transition-colors">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{p.label}</span>
                    <span className="font-mono font-bold text-lg mt-1">{p.timeStr}</span>
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
