"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface ReportSettings {
  reportEnabled: boolean;
  reportRecipients: string[];
  reportFrequency: "daily" | "weekly" | "monthly";
  reportDayOfWeek: number;
  reportLastSentAt: string | null;
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

export default function WeightReport() {
  const [settings, setSettings] = useState<ReportSettings>({
    reportEnabled: false,
    reportRecipients: [],
    reportFrequency: "weekly",
    reportDayOfWeek: 1,
    reportLastSentAt: null,
  });
  const [recipientInput, setRecipientInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch("/api/report/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSettings(data);
          setRecipientInput(data.reportRecipients.join(", "));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    // Parse recipient input into array
    const recipients = recipientInput
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const res = await fetch("/api/report/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, reportRecipients: recipients }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Errore durante il salvataggio");
        return;
      }
      const saved = await res.json();
      setSettings(saved);
      setRecipientInput(saved.reportRecipients.join(", "));
      toast.success("Impostazioni report salvate");
    } finally {
      setSaving(false);
    }
  }

  async function sendNow() {
    setSending(true);
    try {
      const res = await fetch("/api/report/send", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Errore durante l'invio");
        return;
      }
      toast.success("Report inviato con successo!");
      // Refresh lastSentAt
      const settingsRes = await fetch("/api/report/settings");
      if (settingsRes.ok) setSettings(await settingsRes.json());
    } finally {
      setSending(false);
    }
  }

  if (loading) return null;

  return (
    <Card className="overflow-hidden">
      <div className="h-[3px] bg-[var(--run-accent)]" />
      <CardContent className="pt-4 pb-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Report via email</h3>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-muted-foreground">
              {settings.reportEnabled ? "Attivo" : "Disattivato"}
            </span>
            <button
              role="switch"
              aria-checked={settings.reportEnabled}
              onClick={() =>
                setSettings((s) => ({ ...s, reportEnabled: !s.reportEnabled }))
              }
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                settings.reportEnabled
                  ? "bg-[var(--run-accent)]"
                  : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
                  settings.reportEnabled ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        </div>

        {/* Recipients */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Destinatari
          </label>
          <input
            type="text"
            value={recipientInput}
            onChange={(e) => setRecipientInput(e.target.value)}
            placeholder="email@esempio.it, altro@esempio.it"
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-[var(--run-accent)]"
          />
          <p className="text-xs text-muted-foreground">
            Separati da virgola o spazio
          </p>
        </div>

        {/* Frequency */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Frequenza
          </label>
          <div className="flex gap-2">
            {(["daily", "weekly", "monthly"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setSettings((s) => ({ ...s, reportFrequency: f }))}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  settings.reportFrequency === f
                    ? "bg-[var(--run-accent)] text-white border-[var(--run-accent)]"
                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                {f === "daily" ? "Giornaliero" : f === "weekly" ? "Settimanale" : "Mensile"}
              </button>
            ))}
          </div>
        </div>

        {/* Day of week (only for weekly) */}
        {settings.reportFrequency === "weekly" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Giorno della settimana
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {DAY_NAMES.map((name, i) => (
                <button
                  key={i}
                  onClick={() => setSettings((s) => ({ ...s, reportDayOfWeek: i }))}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    settings.reportDayOfWeek === i
                      ? "bg-[var(--run-accent)] text-white border-[var(--run-accent)]"
                      : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Last sent */}
        {settings.reportLastSentAt && (
          <p className="text-xs text-muted-foreground">
            Ultimo invio:{" "}
            {new Date(settings.reportLastSentAt).toLocaleString("it-IT", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2 rounded-md text-sm font-semibold bg-[var(--run-accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Salvataggio..." : "Salva impostazioni"}
          </button>
          <button
            onClick={sendNow}
            disabled={sending || !settings.reportEnabled || recipientInput.trim() === ""}
            className="px-4 py-2 rounded-md text-sm font-semibold border border-[var(--run-accent)] text-[var(--run-accent)] hover:bg-[var(--run-accent)] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? "Invio..." : "Invia ora"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
