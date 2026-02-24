"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [date, setDate] = useState(toLocalDateString(new Date()));
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);

  const today = toLocalDateString(new Date());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const weightKg = parseFloat(weight);
    if (isNaN(weightKg) || weightKg < 30 || weightKg > 300) {
      toast.error("Inserisci un peso valido tra 30 e 300 kg");
      return;
    }

    if (date > today) {
      toast.error("La data non può essere futura");
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
        throw new Error(err.error ?? "Errore durante il salvataggio");
      }

      toast.success("Peso salvato con successo!");
      setWeight("");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore imprevisto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inserisci peso</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">Data</Label>
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
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                min="30"
                max="300"
                placeholder="es. 72.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Salvataggio..." : "Salva"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
