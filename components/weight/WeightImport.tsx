"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations, interpolate } from "@/lib/i18n/LanguageContext";
import type { Translations } from "@/lib/i18n/translations";

interface ParsedRow {
  date: string;
  weightKg: number;
}

function parseCSV(text: string, tw: Translations["weight"]): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error(tw.importEmpty);

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const dateIdx = header.indexOf("date");
  const recordedIdx = header.indexOf("recorded");

  if (dateIdx === -1) throw new Error(tw.importNoDate);
  if (recordedIdx === -1) throw new Error(tw.importNoRecorded);

  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(",");
    const dateStr = cols[dateIdx]?.trim();
    const weightStr = cols[recordedIdx]?.trim();

    if (!dateStr || !weightStr) continue;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new Error(interpolate(tw.importInvalidDate, { i: i + 1, val: dateStr }));
    }

    const weightKg = parseFloat(weightStr);
    if (isNaN(weightKg)) {
      throw new Error(interpolate(tw.importInvalidWeight, { i: i + 1, val: weightStr }));
    }

    rows.push({ date: dateStr, weightKg });
  }

  if (rows.length === 0) throw new Error(tw.importNoRows);
  return rows;
}

interface WeightImportProps {
  onSuccess: () => void;
}

export default function WeightImport({ onSuccess }: WeightImportProps) {
  const { t } = useTranslations();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const rows = parseCSV(text, t.weight);
        setPreview(rows);
        toast.info(interpolate(t.weight.importReady, { n: rows.length }));
      } catch (err) {
        setPreview(null);
        toast.error(err instanceof Error ? err.message : t.weight.importParseError);
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!preview) return;
    setLoading(true);

    try {
      const res = await fetch("/api/weight/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? t.weight.importError);
      }

      const { inserted, updated, total } = await res.json();
      toast.success(interpolate(t.weight.importSuccess, { total, inserted, updated }));
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.weight.unexpectedError);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.weight.importTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {interpolate(t.weight.importFormat, { date: "Date", recorded: "Recorded" })}
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
        />

        {preview && (
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-border overflow-auto max-h-40">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">{t.weight.importDateCol}</th>
                    <th className="text-right px-3 py-2 font-medium">{t.weight.importWeightCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5">{row.date}</td>
                      <td className="px-3 py-1.5 text-right">{row.weightKg}</td>
                    </tr>
                  ))}
                  {preview.length > 5 && (
                    <tr className="border-t border-border">
                      <td colSpan={2} className="px-3 py-1.5 text-center text-muted-foreground">
                        {interpolate(t.weight.importMoreRows, { n: preview.length - 5 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={loading} className="flex-1">
                {loading
                  ? t.weight.importingBtn
                  : interpolate(t.weight.importBtn, { n: preview.length })}
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={loading}>
                {t.weight.importCancelBtn}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
