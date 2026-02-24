"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WeightTargetProps {
  currentTarget: number | null;
  onSuccess: (newTarget: number | null) => void;
}

export default function WeightTarget({
  currentTarget,
  onSuccess,
}: WeightTargetProps) {
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
      toast.error("Inserisci un peso target valido tra 30 e 300 kg");
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
        throw new Error(err.error ?? "Errore durante il salvataggio");
      }

      toast.success("Peso target aggiornato!");
      onSuccess(targetWeightKg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore imprevisto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Peso obiettivo</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex flex-col gap-1.5 flex-1">
            <Label htmlFor="target">Target (kg)</Label>
            <Input
              id="target"
              type="number"
              step="0.1"
              min="30"
              max="300"
              placeholder="es. 70.0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvataggio..." : "Imposta"}
            </Button>
          </div>
        </form>
        {currentTarget !== null && (
          <p className="text-sm text-muted-foreground mt-2">
            Target attuale: <strong>{currentTarget} kg</strong>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
