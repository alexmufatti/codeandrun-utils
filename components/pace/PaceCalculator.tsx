"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import PaceSplits from "@/components/pace/PaceSplits";
import {
  parsePace,
  formatPace,
  parseTime,
  formatTime,
  calculatePace,
  calculateTime,
  calculateDistance,
  generateSplits,
} from "@/lib/pace/calculations";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import type { CalcMode, SplitUnit } from "@/types/pace";
import { cn } from "@/lib/utils";

const PRESET_DISTANCES: { label: string; value: string }[] = [
  { label: "5K", value: "5" },
  { label: "10K", value: "10" },
  { label: "Mezza", value: "21.0975" },
  { label: "Maratona", value: "42.195" },
];

export default function PaceCalculator() {
  const { t } = useTranslations();
  const [mode, setMode] = useState<CalcMode>("pace");
  const [distanceInput, setDistanceInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [paceInput, setPaceInput] = useState("");
  const [showSplits, setShowSplits] = useState(false);
  const [splitUnit, setSplitUnit] = useState<SplitUnit>("km");

  const MODES: { value: CalcMode; label: string }[] = [
    { value: "pace", label: t.pace.calcPaceMode },
    { value: "time", label: t.pace.calcTimeMode },
    { value: "distance", label: t.pace.calcDistanceMode },
  ];

  const result = useMemo(() => {
    const dist = parseFloat(distanceInput);
    const timeSec = parseTime(timeInput);
    const paceSec = parsePace(paceInput);

    if (mode === "pace") {
      if (!isFinite(dist) || dist <= 0 || !isFinite(timeSec) || timeSec <= 0) return null;
      return { value: formatPace(calculatePace(dist, timeSec)), label: t.pace.paceLabel };
    }
    if (mode === "time") {
      if (!isFinite(dist) || dist <= 0 || !isFinite(paceSec) || paceSec <= 0) return null;
      return { value: formatTime(calculateTime(dist, paceSec)), label: t.pace.timeLabel };
    }
    if (!isFinite(timeSec) || timeSec <= 0 || !isFinite(paceSec) || paceSec <= 0) return null;
    return {
      value: `${calculateDistance(timeSec, paceSec).toFixed(3)} km`,
      label: t.pace.distanceLabel,
    };
  }, [mode, distanceInput, timeInput, paceInput, t]);

  const splits = useMemo(() => {
    if (!showSplits) return [];
    const dist = parseFloat(distanceInput);
    let paceSec: number;

    if (mode === "pace" && result) {
      const timeSec = parseTime(timeInput);
      paceSec = calculatePace(dist, timeSec);
    } else if (mode === "time") {
      paceSec = parsePace(paceInput);
    } else {
      return [];
    }

    if (!isFinite(dist) || dist <= 0 || !isFinite(paceSec) || paceSec <= 0) return [];
    return generateSplits(dist, paceSec, splitUnit);
  }, [showSplits, splitUnit, mode, distanceInput, timeInput, paceInput, result]);

  const canShowSplits = mode !== "distance" && !!result;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.pace.calculatorTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Mode selector */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {MODES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Preset distance chips */}
        {mode !== "distance" && (
          <div className="flex flex-wrap gap-1.5">
            {PRESET_DISTANCES.map(({ label, value }) => {
              const active = distanceInput === value;
              return (
                <button
                  key={value}
                  onClick={() => setDistanceInput(active ? "" : value)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              );
            })}
            <button
              onClick={() => setDistanceInput("")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                !PRESET_DISTANCES.some((p) => p.value === distanceInput)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              )}
            >
              {t.pace.freeDistance}
            </button>
          </div>
        )}

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Distance */}
          <div className="flex flex-col gap-1.5">
            <Label>{t.pace.distanceLabel}</Label>
            {mode === "distance" ? (
              <div className={cn(
                "flex h-9 items-center rounded-md border border-primary bg-primary/5 px-3 text-sm font-semibold text-primary",
                result ? "" : "text-muted-foreground"
              )}>
                {result?.value ?? "—"}
              </div>
            ) : (
              <Input
                placeholder="es. 42.195"
                value={distanceInput}
                onChange={(e) => setDistanceInput(e.target.value)}
              />
            )}
          </div>

          {/* Time */}
          <div className="flex flex-col gap-1.5">
            <Label>{t.pace.timeLabel}</Label>
            {mode === "time" ? (
              <div className={cn(
                "flex h-9 items-center rounded-md border border-primary bg-primary/5 px-3 text-sm font-semibold text-primary font-mono",
                result ? "" : "text-muted-foreground"
              )}>
                {result?.value ?? "—"}
              </div>
            ) : (
              <Input
                placeholder="es. 3:30:00"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                className="font-mono"
              />
            )}
          </div>

          {/* Pace */}
          <div className="flex flex-col gap-1.5">
            <Label>{t.pace.paceLabel}</Label>
            {mode === "pace" ? (
              <div className={cn(
                "flex h-9 items-center rounded-md border border-primary bg-primary/5 px-3 text-sm font-semibold text-primary font-mono",
                result ? "" : "text-muted-foreground"
              )}>
                {result?.value ?? "—"}
              </div>
            ) : (
              <Input
                placeholder="es. 4:58"
                value={paceInput}
                onChange={(e) => setPaceInput(e.target.value)}
                className="font-mono"
              />
            )}
          </div>
        </div>

        {/* Splits toggle */}
        {canShowSplits && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant={showSplits ? "default" : "outline"}
                size="sm"
                onClick={() => setShowSplits((v) => !v)}
              >
                {showSplits ? t.pace.hideSplits : t.pace.showSplits}
              </Button>

              {showSplits && (
                <div className="flex gap-1 rounded-md bg-muted p-0.5">
                  {(["km", "mi"] as SplitUnit[]).map((u) => (
                    <button
                      key={u}
                      onClick={() => setSplitUnit(u)}
                      className={cn(
                        "px-3 py-1 rounded text-sm font-medium transition-colors",
                        splitUnit === u
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {showSplits && splits.length > 0 && <PaceSplits splits={splits} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
