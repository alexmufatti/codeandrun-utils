"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { calculateSegments, formatTime, formatPace } from "@/lib/pace/calculations";
import { cn } from "@/lib/utils";
import { useTranslations, interpolate } from "@/lib/i18n/LanguageContext";
import type { Segment } from "@/types/pace";

const PRESET_DISTANCES = [
  { label: "5K", value: "5" },
  { label: "10K", value: "10" },
  { label: "Mezza", value: "21.0975" },
  { label: "Maratona", value: "42.195" },
];

function makeSegment(): Segment {
  return {
    id: Math.random().toString(36).slice(2),
    label: "",
    distanceKm: "",
    paceInput: "",
    isRest: false,
  };
}

export default function RaceSegments() {
  const { t } = useTranslations();
  const [totalRaceKm, setTotalRaceKm] = useState("");
  const [segments, setSegments] = useState<Segment[]>([makeSegment(), makeSegment()]);

  function update(id: string, field: "label" | "distanceKm" | "paceInput", value: string) {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  }

  function toggleRest(id: string) {
    setSegments((prev) =>
      prev.map((s) => ({ ...s, isRest: s.id === id ? !s.isRest : false }))
    );
  }

  function addSegment() {
    setSegments((prev) => [...prev, makeSegment()]);
  }

  function removeSegment(id: string) {
    setSegments((prev) => prev.filter((s) => s.id !== id));
  }

  const totalKm = parseFloat(totalRaceKm);
  const otherDists = segments
    .filter((s) => !s.isRest)
    .reduce((sum, s) => {
      const d = parseFloat(s.distanceKm);
      return sum + (isFinite(d) && d > 0 ? d : 0);
    }, 0);
  const restDistKm = isFinite(totalKm) && totalKm > 0 ? totalKm - otherDists : NaN;

  const effectiveSegments = segments.map((s) =>
    s.isRest
      ? { ...s, distanceKm: isFinite(restDistKm) && restDistKm > 0 ? String(restDistKm) : "" }
      : s
  );
  const totals = calculateSegments(effectiveSegments);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.pace.segmentsTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Total race distance */}
        <div className="flex flex-col gap-2 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Label className="whitespace-nowrap shrink-0">{t.pace.raceDistance}</Label>
            <Input
              className="w-36"
              placeholder="es. 42.195"
              value={totalRaceKm}
              onChange={(e) => setTotalRaceKm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_DISTANCES.map(({ label, value }) => {
              const active = totalRaceKm === value;
              return (
                <button
                  key={value}
                  onClick={() => setTotalRaceKm(active ? "" : value)}
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
          </div>
        </div>

        {/* Column headers */}
        <div className="hidden sm:grid grid-cols-[1fr_160px_120px_36px] gap-2 px-1">
          <Label className="text-xs text-muted-foreground">{t.pace.segmentLabelCol}</Label>
          <Label className="text-xs text-muted-foreground">{t.pace.segmentDistanceCol}</Label>
          <Label className="text-xs text-muted-foreground">{t.pace.segmentPaceCol}</Label>
          <span />
        </div>

        {/* Segment rows */}
        {segments.map((seg, i) => {
          const isRest = seg.isRest ?? false;
          const restVal =
            isFinite(restDistKm) && restDistKm > 0 ? restDistKm.toFixed(3) : null;

          return (
            <div
              key={seg.id}
              className="grid grid-cols-1 sm:grid-cols-[1fr_160px_120px_36px] gap-2 items-end"
            >
              <div className="flex flex-col gap-1">
                <Label className="sm:hidden text-xs text-muted-foreground">
                  {t.pace.segmentLabelCol}
                </Label>
                <Input
                  placeholder={interpolate(t.pace.segmentPlaceholder, { n: i + 1 })}
                  value={seg.label}
                  onChange={(e) => update(seg.id, "label", e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="sm:hidden text-xs text-muted-foreground">
                  {t.pace.segmentDistanceCol}
                </Label>
                <div className="flex gap-1.5 items-center">
                  {isRest ? (
                    <div
                      className={cn(
                        "flex-1 flex h-9 items-center rounded-md border px-3 text-sm font-mono",
                        restVal
                          ? "border-primary bg-primary/5 text-primary font-semibold"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      {restVal ? `${restVal} km` : "—"}
                    </div>
                  ) : (
                    <Input
                      className="flex-1"
                      placeholder={t.pace.distancePlaceholder}
                      value={seg.distanceKm}
                      onChange={(e) => update(seg.id, "distanceKm", e.target.value)}
                    />
                  )}
                  <button
                    onClick={() => toggleRest(seg.id)}
                    title={t.pace.segmentRest}
                    className={cn(
                      "shrink-0 rounded px-2 h-9 text-xs font-medium border transition-colors",
                      isRest
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    )}
                  >
                    {t.pace.segmentRest}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="sm:hidden text-xs text-muted-foreground">
                  {t.pace.segmentPaceCol}
                </Label>
                <Input
                  placeholder={t.pace.pacePlaceholder}
                  value={seg.paceInput}
                  onChange={(e) => update(seg.id, "paceInput", e.target.value)}
                  className="font-mono"
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeSegment(seg.id)}
                disabled={segments.length <= 1}
                className="text-muted-foreground hover:text-destructive"
                aria-label={t.pace.removeSegment}
              >
                ×
              </Button>
            </div>
          );
        })}

        <Button variant="outline" size="sm" onClick={addSegment} className="self-start">
          {t.pace.addSegment}
        </Button>

        {totals && (
          <div className="rounded-lg bg-muted px-4 py-3 grid grid-cols-3 gap-4 text-sm">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{t.pace.totalDistance}</span>
              <span className="font-semibold">{totals.totalDistKm.toFixed(3)} km</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{t.pace.totalTime}</span>
              <span className="font-semibold font-mono">{formatTime(totals.totalTimeSec)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{t.pace.avgPace}</span>
              <span className="font-semibold font-mono">{formatPace(totals.avgPaceSec)} /km</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
