"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import StravaActivities from "./StravaActivities";

interface StravaStatus {
  connected: boolean;
  athleteId?: number;
  athleteFirstname?: string;
  athleteLastname?: string;
}

export default function StravaPageClient({ error, isWpUser }: { error: string | null; isWpUser: boolean }) {
  const { t } = useTranslations();
  const router = useRouter();
  const [status, setStatus] = useState<StravaStatus | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetch("/api/connect/strava/status")
      .then((r) => r.json())
      .then(setStatus);
  }, []);

  async function handleDisconnect() {
    setDisconnecting(true);
    await fetch("/api/connect/strava/disconnect", { method: "DELETE" });
    setStatus({ connected: false });
    setDisconnecting(false);
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">{t.strava.pageTitle}</h1>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error === "access_denied"
            ? t.strava.errorAccessDenied
            : t.strava.errorTokenExchange}
        </div>
      )}

      {/* Card connessione */}
      <div className="rounded-lg border border-border bg-card p-4 mb-6">
        {status === null ? (
          <div className="text-sm text-muted-foreground">{t.auth.loading}</div>
        ) : status.connected ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FC4C02] text-white font-bold text-xs">
                S
              </div>
              <div>
                <p className="text-sm font-medium">
                  {status.athleteFirstname} {status.athleteLastname}
                </p>
                <p className="text-xs text-muted-foreground">{t.strava.connected}</p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              {disconnecting ? t.strava.disconnecting : t.strava.disconnect}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">{t.strava.notConnectedDesc}</p>
            <a
              href="/api/connect/strava"
              className="inline-flex items-center gap-2 rounded-md bg-[#FC4C02] px-4 py-2 text-sm font-medium text-white hover:bg-[#e04400] transition-colors whitespace-nowrap"
            >
              {t.strava.connectBtn}
            </a>
          </div>
        )}
      </div>

      {/* Lista attività */}
      {status?.connected && <StravaActivities isWpUser={isWpUser} />}
    </main>
  );
}
