"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "@/lib/i18n/LanguageContext";

interface WeightFormProps {
  onSuccess: () => void;
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function WeightForm({ onSuccess }: WeightFormProps) {
  const { t } = useTranslations();
  const [date, setDate] = useState(toLocalDateString(new Date()));
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);

  const today = toLocalDateString(new Date());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const weightKg = parseFloat(weight);
    if (isNaN(weightKg) || weightKg < 30 || weightKg > 300) {
      toast.error(t.weight.validWeight);
      return;
    }

    if (date > today) {
      toast.error(t.weight.validDate);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, weightKg }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? t.weight.saveError);
      }

      toast.success(t.weight.saveSuccess);
      setWeight("");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.weight.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.weight.formTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">{t.weight.dateLabel}</Label>
              <Input
                id="date"
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="weight">{t.weight.weightLabel}</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="30"
                max="300"
                placeholder={t.weight.weightPlaceholder}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t.weight.savingBtn : t.weight.saveBtn}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
