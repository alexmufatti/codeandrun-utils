"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import { calculateZonesMhr, calculateZonesKarvonen } from "@/lib/hr/calculations";
import type { HrZone } from "@/types/hr";

type Method = "max" | "karvonen";

const ZONE_COLORS: Record<HrZone["id"], string> = {
  1: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  2: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  3: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  4: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  5: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
};

export default function HrCalculator() {
  const { t } = useTranslations();

  const [maxHr, setMaxHr] = useState("");
  const [restingHr, setRestingHr] = useState("");
  const [method, setMethod] = useState<Method>("max");
  const [zones, setZones] = useState<HrZone[] | null>(null);
  const [saving, setSaving] = useState(false);

  const ZONE_META: Record<HrZone["id"], { name: string; desc: string; intensity: string }> = {
    1: { name: t.hr.zone1, desc: t.hr.desc1, intensity: t.hr.intensity1 },
    2: { name: t.hr.zone2, desc: t.hr.desc2, intensity: t.hr.intensity2 },
    3: { name: t.hr.zone3, desc: t.hr.desc3, intensity: t.hr.intensity3 },
    4: { name: t.hr.zone4, desc: t.hr.desc4, intensity: t.hr.intensity4 },
    5: { name: t.hr.zone5, desc: t.hr.desc5, intensity: t.hr.intensity5 },
  };

  useEffect(() => {
    fetch("/api/hr/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.hrMaxBpm) setMaxHr(String(data.hrMaxBpm));
        if (data.hrRestingBpm) setRestingHr(String(data.hrRestingBpm));
        if (data.hrZoneMethod) setMethod(data.hrZoneMethod as Method);
      })
      .catch(() => {});
  }, []);

  const maxHrNum = parseInt(maxHr, 10);
  const restingHrNum = parseInt(restingHr, 10);

  const isMaxHrValid = Number.isFinite(maxHrNum) && maxHrNum > 0 && maxHrNum <= 250;
  const isRestingHrValid =
    method === "max" ||
    (Number.isFinite(restingHrNum) && restingHrNum > 0 && restingHrNum < maxHrNum);

  const canCalculate = isMaxHrValid && isRestingHrValid;

  async function handleCalculate() {
    if (!canCalculate) return;

    const computed =
      method === "karvonen"
        ? calculateZonesKarvonen(maxHrNum, restingHrNum)
        : calculateZonesMhr(maxHrNum);

    setZones(computed);

    setSaving(true);
    try {
      await fetch("/api/hr/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hrMaxBpm: maxHrNum,
          hrRestingBpm: method === "karvonen" ? restingHrNum : null,
          hrZoneMethod: method,
        }),
      });
    } finally {
      setSaving(false);
    }
  }

  function handleMethodChange(m: Method) {
    setMethod(m);
    setZones(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.hr.pageTitle}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{t.hr.pageSubtitle}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Method toggle */}
          <div className="flex gap-1.5">
            {(["max", "karvonen"] as Method[]).map((m) => (
              <button
                key={m}
                onClick={() => handleMethodChange(m)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                  method === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                )}
              >
                {m === "max" ? t.hr.methodMax : t.hr.methodKarvonen}
              </button>
            ))}
          </div>

          {/* Inputs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-col gap-1.5 flex-1 sm:max-w-xs">
              <Label>{t.hr.maxHrLabel}</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={50}
                max={250}
                placeholder="es. 185"
                value={maxHr}
                onChange={(e) => { setMaxHr(e.target.value); setZones(null); }}
                onKeyDown={(e) => e.key === "Enter" && canCalculate && handleCalculate()}
                className="font-mono"
              />
            </div>

            {method === "karvonen" && (
              <div className="flex flex-col gap-1.5 flex-1 sm:max-w-xs">
                <Label>{t.hr.restingHrLabel}</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={30}
                  max={120}
                  placeholder="es. 55"
                  value={restingHr}
                  onChange={(e) => { setRestingHr(e.target.value); setZones(null); }}
                  onKeyDown={(e) => e.key === "Enter" && canCalculate && handleCalculate()}
                  className="font-mono"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleCalculate}
            disabled={!canCalculate || saving}
            className={cn(
              "self-start rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              canCalculate && !saving
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {saving ? t.hr.calculatingBtn : t.hr.calculateBtn}
          </button>
        </CardContent>
      </Card>

      {/* Results */}
      {zones && (
        <Card>
          <CardHeader>
            <CardTitle>{t.hr.zonesTitle}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border">
            {zones.map((zone) => {
              const meta = ZONE_META[zone.id];
              const colorClass = ZONE_COLORS[zone.id];
              return (
                <div key={zone.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={cn("shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full border text-xs font-bold", colorClass)}>
                    Z{zone.id}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{meta.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{meta.desc}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono font-semibold text-sm tabular-nums">
                      {zone.minBpm}–{zone.maxBpm}
                      <span className="text-xs text-muted-foreground font-normal ml-1">bpm</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{meta.intensity}</div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
