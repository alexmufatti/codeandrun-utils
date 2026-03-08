"use client";

import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { parseStartTime, parsePace, calculatePassageTime } from "@/lib/pace/calculations";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n/LanguageContext";

interface Checkpoint {
  id: string;
  label: string;
  distanceKm: string;
}

function makeCheckpoint(): Checkpoint {
  return {
    id: Math.random().toString(36).slice(2),
    label: "",
    distanceKm: "",
  };
}

export default function PassageTimes() {
  const { t } = useTranslations();
  const [startTime, setStartTime] = useLocalStorage("pace-passage-start-time", "");
  const [paceInput, setPaceInput] = useLocalStorage("pace-passage-pace", "");
  const [toleranceInput, setToleranceInput] = useLocalStorage("pace-passage-tolerance", "");
  const [checkpoints, setCheckpoints] = useLocalStorage<Checkpoint[]>("pace-passage-checkpoints", [
    makeCheckpoint(),
    makeCheckpoint(),
    makeCheckpoint(),
  ]);

  const startMinutes = parseStartTime(startTime);
  const paceSec = parsePace(paceInput);
  const toleranceSec = Math.max(0, parseInt(toleranceInput) || 0);
  const hasRange = toleranceSec > 0;
  const inputsValid = isFinite(startMinutes) && isFinite(paceSec) && paceSec > 0;

  function updateCheckpoint(id: string, field: "label" | "distanceKm", value: string) {
    setCheckpoints((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  function addCheckpoint() {
    setCheckpoints((prev) => [...prev, makeCheckpoint()]);
  }

  function removeCheckpoint(id: string) {
    setCheckpoints((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-[3px] bg-[var(--run-accent)]" />
      <CardHeader>
        <CardTitle>{t.pace.passageTimesTitle}</CardTitle>
        <p className="text-sm text-muted-foreground">{t.pace.passageTimesDesc}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Start time + Pace + Tolerance inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-border">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t.pace.startTimeLabel}
            </Label>
            <Input
              placeholder={t.pace.startTimePlaceholder}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="font-mono h-10 w-36"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t.pace.passageTimePaceLabel}
            </Label>
            <Input
              placeholder={t.pace.pacePlaceholder}
              value={paceInput}
              onChange={(e) => setPaceInput(e.target.value)}
              className="font-mono h-10 w-36"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t.pace.toleranceLabel}
            </Label>
            <Input
              placeholder={t.pace.tolerancePlaceholder}
              value={toleranceInput}
              onChange={(e) => setToleranceInput(e.target.value)}
              className="font-mono h-10 w-36"
              type="number"
              min={0}
            />
          </div>
        </div>

        {/* Column headers */}
        <div className={cn(
          "hidden sm:grid gap-2 px-1",
          hasRange
            ? "grid-cols-[28px_1fr_140px_200px_36px]"
            : "grid-cols-[28px_1fr_140px_120px_36px]"
        )}>
          <span />
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t.pace.checkpointNameCol}
          </Label>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t.pace.checkpointDistCol}
          </Label>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t.pace.passageTimeCol}
          </Label>
          <span />
        </div>

        {/* Checkpoint rows */}
        {checkpoints.map((cp, i) => {
          const dist = parseFloat(cp.distanceKm);
          const isValid = inputsValid && isFinite(dist) && dist > 0;

          let passageDisplay = "—";
          if (isValid) {
            if (hasRange) {
              const fastPace = Math.max(1, paceSec - toleranceSec);
              const slowPace = paceSec + toleranceSec;
              const early = calculatePassageTime(startMinutes, dist, fastPace);
              const late = calculatePassageTime(startMinutes, dist, slowPace);
              passageDisplay = `${early} – ${late}`;
            } else {
              passageDisplay = calculatePassageTime(startMinutes, dist, paceSec);
            }
          }

          const hasResult = passageDisplay !== "—";

          return (
            <div
              key={cp.id}
              className={cn(
                "grid grid-cols-1 gap-2 items-end",
                hasRange
                  ? "sm:grid-cols-[28px_1fr_140px_200px_36px]"
                  : "sm:grid-cols-[28px_1fr_140px_120px_36px]"
              )}
            >
              {/* Row number */}
              <div className="hidden sm:flex h-10 w-7 items-center justify-center rounded-md bg-muted text-xs font-mono text-muted-foreground">
                {i + 1}
              </div>

              <div className="flex flex-col gap-1">
                <Label className="sm:hidden text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.pace.checkpointNameCol}
                </Label>
                <Input
                  placeholder={t.pace.checkpointNamePlaceholder}
                  value={cp.label}
                  onChange={(e) => updateCheckpoint(cp.id, "label", e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="sm:hidden text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.pace.checkpointDistCol}
                </Label>
                <Input
                  placeholder={t.pace.distancePlaceholder}
                  value={cp.distanceKm}
                  onChange={(e) => updateCheckpoint(cp.id, "distanceKm", e.target.value)}
                  className="font-mono h-10"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="sm:hidden text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.pace.passageTimeCol}
                </Label>
                <div
                  className={cn(
                    "flex h-10 items-center rounded-md border px-3 text-sm font-mono font-semibold transition-colors",
                    hasResult
                      ? "border-[var(--run-accent)] bg-[var(--run-accent-muted)] text-[var(--run-accent)]"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {passageDisplay}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeCheckpoint(cp.id)}
                disabled={checkpoints.length <= 1}
                className="text-muted-foreground hover:text-destructive h-10"
                aria-label={t.pace.removeCheckpoint}
              >
                ×
              </Button>
            </div>
          );
        })}

        <Button variant="outline" size="sm" onClick={addCheckpoint} className="self-start">
          {t.pace.addCheckpoint}
        </Button>
      </CardContent>
    </Card>
  );
}
