"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import { calcMaxHr, calculateZonesMhr, calculateZonesKarvonen } from "@/lib/hr/calculations";
import { DEFAULT_ZONE_PERCENTS } from "@/types/hr";
import type { HrZone, HrSource, HrFormula, ZonePercent } from "@/types/hr";

type Method = "max" | "karvonen";

const ZONE_COLORS: Record<HrZone["id"], string> = {
  1: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  2: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  3: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  4: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  5: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
};

const FORMULAS: { id: HrFormula; label: string; equation: string }[] = [
  { id: "fox",     label: "Fox",     equation: "220 − età" },
  { id: "tanaka",  label: "Tanaka",  equation: "208 − 0.7×età" },
  { id: "gellish", label: "Gellish", equation: "207 − 0.7×età" },
  { id: "nes",     label: "Nes",     equation: "211 − 0.64×età" },
];

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export default function HrCalculator() {
  const { t } = useTranslations();

  // FCMax source
  const [hrSource, setHrSource] = useState<HrSource>("manual");
  const [maxHr, setMaxHr] = useState("");
  const [age, setAge] = useState("");
  const [formula, setFormula] = useState<HrFormula>("fox");

  // Zone method
  const [method, setMethod] = useState<Method>("max");
  const [restingHr, setRestingHr] = useState("");

  // Zone percentages
  const [zonePercents, setZonePercents] = useState<ZonePercent[]>(
    DEFAULT_ZONE_PERCENTS.map((z) => ({ ...z }))
  );

  const [zones, setZones] = useState<HrZone[] | null>(null);
  const [saving, setSaving] = useState(false);

  const ZONE_META: Record<HrZone["id"], { name: string; desc: string }> = {
    1: { name: t.hr.zone1, desc: t.hr.desc1 },
    2: { name: t.hr.zone2, desc: t.hr.desc2 },
    3: { name: t.hr.zone3, desc: t.hr.desc3 },
    4: { name: t.hr.zone4, desc: t.hr.desc4 },
    5: { name: t.hr.zone5, desc: t.hr.desc5 },
  };

  useEffect(() => {
    fetch("/api/hr/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.hrMaxBpm) setMaxHr(String(data.hrMaxBpm));
        if (data.hrRestingBpm) setRestingHr(String(data.hrRestingBpm));
        if (data.hrZoneMethod) setMethod(data.hrZoneMethod as Method);
        if (data.hrSource) setHrSource(data.hrSource as HrSource);
        if (data.hrAge) setAge(String(data.hrAge));
        if (data.hrFormula) setFormula(data.hrFormula as HrFormula);
        if (data.hrZonePercents && Array.isArray(data.hrZonePercents) && data.hrZonePercents.length === 5) {
          setZonePercents(data.hrZonePercents);
        }
        if (data.hrZones && Array.isArray(data.hrZones) && data.hrZones.length === 5) {
          setZones(data.hrZones as HrZone[]);
        }
      })
      .catch(() => {});
  }, []);

  // Effective max HR
  const ageNum = parseInt(age, 10);
  const maxHrNum = parseInt(maxHr, 10);
  const computedMaxHr =
    hrSource === "formula" && Number.isFinite(ageNum) && ageNum >= 10 && ageNum <= 120
      ? calcMaxHr(ageNum, formula)
      : null;
  const effectiveMaxHr = hrSource === "manual" ? maxHrNum : (computedMaxHr ?? NaN);

  const restingHrNum = parseInt(restingHr, 10);

  const isMaxHrValid = Number.isFinite(effectiveMaxHr) && effectiveMaxHr > 0 && effectiveMaxHr <= 250;
  const isRestingHrValid =
    method === "max" ||
    (Number.isFinite(restingHrNum) && restingHrNum > 0 && restingHrNum < effectiveMaxHr);

  const canCalculate = isMaxHrValid && isRestingHrValid;

  function handlePercentChange(idx: number, field: "min" | "max", value: string) {
    const num = parseInt(value, 10);
    if (!Number.isFinite(num)) return;
    setZonePercents((prev) => {
      const next = prev.map((z) => ({ ...z }));
      next[idx][field] = num;
      return next;
    });
    setZones(null);
  }

  function resetPercents() {
    setZonePercents(DEFAULT_ZONE_PERCENTS.map((z) => ({ ...z })));
    setZones(null);
  }

  async function handleCalculate() {
    if (!canCalculate) return;

    const computed =
      method === "karvonen"
        ? calculateZonesKarvonen(effectiveMaxHr, restingHrNum, zonePercents)
        : calculateZonesMhr(effectiveMaxHr, zonePercents);

    setZones(computed);

    setSaving(true);
    try {
      await fetch("/api/hr/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hrMaxBpm: hrSource === "manual" ? (Number.isFinite(maxHrNum) ? maxHrNum : null) : null,
          hrRestingBpm: method === "karvonen" ? restingHrNum : null,
          hrZoneMethod: method,
          hrSource,
          hrAge: hrSource === "formula" && Number.isFinite(ageNum) ? ageNum : null,
          hrFormula: hrSource === "formula" ? formula : null,
          hrZonePercents: zonePercents,
          hrZones: computed,
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

  function handleSourceChange(s: HrSource) {
    setHrSource(s);
    setZones(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Input card */}
      <Card>
        <CardHeader>
          <CardTitle>{t.hr.pageTitle}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{t.hr.pageSubtitle}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">

          {/* ── FCMax section ── */}
          <div className="flex flex-col gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              FCMax
            </div>

            {/* Source toggle */}
            <div className="flex gap-1.5">
              <ToggleBtn active={hrSource === "manual"} onClick={() => handleSourceChange("manual")}>
                {t.hr.sourceManual}
              </ToggleBtn>
              <ToggleBtn active={hrSource === "formula"} onClick={() => handleSourceChange("formula")}>
                {t.hr.sourceFormula}
              </ToggleBtn>
            </div>

            {hrSource === "manual" && (
              <div className="flex flex-col gap-1.5 max-w-xs">
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
            )}

            {hrSource === "formula" && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5 max-w-xs">
                  <Label>{t.hr.ageLabel}</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={10}
                    max={120}
                    placeholder="es. 35"
                    value={age}
                    onChange={(e) => { setAge(e.target.value); setZones(null); }}
                    onKeyDown={(e) => e.key === "Enter" && canCalculate && handleCalculate()}
                    className="font-mono"
                  />
                </div>

                {/* Formula selector */}
                <div className="flex flex-wrap gap-1.5">
                  {FORMULAS.map((f) => (
                    <ToggleBtn
                      key={f.id}
                      active={formula === f.id}
                      onClick={() => { setFormula(f.id); setZones(null); }}
                    >
                      {f.label}
                    </ToggleBtn>
                  ))}
                </div>

                {/* Formula equation hint */}
                <p className="text-xs text-muted-foreground">
                  {FORMULAS.find((f) => f.id === formula)?.equation}
                </p>

                {/* Computed max HR preview */}
                {computedMaxHr !== null && (
                  <p className="text-sm font-medium">
                    {t.hr.computedMaxHr}:{" "}
                    <span className="font-mono font-semibold">{computedMaxHr} bpm</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Method section ── */}
          <div className="flex flex-col gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.hr.intensity}
            </div>
            <div className="flex gap-1.5">
              <ToggleBtn active={method === "max"} onClick={() => handleMethodChange("max")}>
                {t.hr.methodMax}
              </ToggleBtn>
              <ToggleBtn active={method === "karvonen"} onClick={() => handleMethodChange("karvonen")}>
                {t.hr.methodKarvonen}
              </ToggleBtn>
            </div>
            {method === "karvonen" && (
              <div className="flex flex-col gap-1.5 max-w-xs">
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

          {/* ── Zone percentages section ── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t.hr.zonePercentsTitle}
              </div>
              <button
                onClick={resetPercents}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
              >
                {t.hr.resetPercents}
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              {zonePercents.map((zp, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className={cn(
                    "shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs font-bold",
                    ZONE_COLORS[(idx + 1) as HrZone["id"]]
                  )}>
                    Z{idx + 1}
                  </span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    value={zp.min}
                    onChange={(e) => handlePercentChange(idx, "min", e.target.value)}
                    className="w-14 font-mono text-center px-1"
                  />
                  <span className="text-xs text-muted-foreground">%–</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    value={zp.max}
                    onChange={(e) => handlePercentChange(idx, "max", e.target.value)}
                    className="w-14 font-mono text-center px-1"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              ))}
            </div>
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
              const zp = zonePercents[zone.id - 1];
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
                    <div className="text-xs text-muted-foreground">
                      {zp.min}–{zp.max}%
                    </div>
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
