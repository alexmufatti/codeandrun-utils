"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "@/lib/i18n/LanguageContext";

interface WeightTargetProps {
  currentTarget: number | null;
  onSuccess: (newTarget: number | null) => void;
}

export default function WeightTarget({
  currentTarget,
  onSuccess,
}: WeightTargetProps) {
  const { t } = useTranslations();
  const [value, setValue] = useState(
    currentTarget !== null ? String(currentTarget) : ""
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const targetWeightKg = value === "" ? null : parseFloat(value);

    if (
      targetWeightKg !== null &&
      (isNaN(targetWeightKg) || targetWeightKg < 30 || targetWeightKg > 300)
    ) {
      toast.error(t.weight.targetValidation);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/weight/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetWeightKg }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? t.weight.targetError);
      }

      toast.success(t.weight.targetSuccess);
      onSuccess(targetWeightKg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.weight.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.weight.targetTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex flex-col gap-1.5 flex-1">
            <Label htmlFor="target">{t.weight.targetLabel}</Label>
            <Input
              id="target"
              type="number"
              step="0.1"
              min="30"
              max="300"
              placeholder={t.weight.targetPlaceholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={loading}>
              {loading ? t.weight.savingBtn : t.weight.targetSetBtn}
            </Button>
          </div>
        </form>
        {currentTarget !== null && (
          <p className="text-sm text-muted-foreground mt-2">
            {t.weight.targetCurrent}: <strong>{currentTarget} kg</strong>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
