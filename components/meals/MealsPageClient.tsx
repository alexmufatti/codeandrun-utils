"use client";

import { useState, useCallback, useEffect } from "react";
import { Share2, Link2, Copy, Check, Trash2, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import MealPlannerGrid from "./MealPlannerGrid";

type ShareInfo = { token: string; canWrite: boolean };

export default function MealsPageClient() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [share, setShare] = useState<ShareInfo | null | undefined>(undefined);
  // undefined = not fetched yet, null = no active share, object = active share
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const shareUrl = share ? `${origin}/shared/${share.token}/meals` : "";

  const fetchShare = useCallback(async () => {
    try {
      const res = await fetch("/api/meals/share");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setShare(data.token ? { token: data.token, canWrite: data.canWrite } : null);
    } catch {
      toast.error("Errore nel caricamento");
    }
  }, []);

  const handleOpenPanel = () => {
    setPanelOpen(true);
    if (share === undefined) fetchShare();
  };

  const handleGenerate = async () => {
    setWorking(true);
    try {
      const res = await fetch("/api/meals/share", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setShare({ token: data.token, canWrite: data.canWrite });
    } catch {
      toast.error("Errore nella generazione del link");
    } finally {
      setWorking(false);
    }
  };

  const handleToggleWrite = async () => {
    if (!share) return;
    setWorking(true);
    try {
      const res = await fetch("/api/meals/share", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canWrite: !share.canWrite }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setShare({ token: data.token, canWrite: data.canWrite });
    } catch {
      toast.error("Errore");
    } finally {
      setWorking(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirm("Revocare il link? Chi lo ha non potrà più accedere al menu.")) return;
    setWorking(true);
    try {
      const res = await fetch("/api/meals/share", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setShare(null);
      toast.success("Link revocato");
    } catch {
      toast.error("Errore nella revoca");
    } finally {
      setWorking(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header with share button */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Menu Settimanale</h1>
        <button
          onClick={() => (panelOpen ? setPanelOpen(false) : handleOpenPanel())}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
            panelOpen
              ? "border-primary/50 text-primary bg-primary/8"
              : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Share2 className="h-3.5 w-3.5" />
          Condividi
        </button>
      </div>

      {/* Share panel */}
      {panelOpen && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="h-[3px] bg-[var(--chart-2)]" />
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Condivisione menu</span>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none w-6 h-6 flex items-center justify-center"
              >
                ×
              </button>
            </div>

            {share === undefined ? (
              <p className="text-sm text-muted-foreground">Caricamento…</p>
            ) : share === null ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Nessun link attivo. Genera un link per permettere a qualcuno di vedere (o
                  modificare) il tuo menu senza bisogno di un account.
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={working}
                  className="px-4 py-1.5 rounded-md text-sm bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {working ? "Generazione…" : "Genera link"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* URL */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs font-mono text-muted-foreground truncate">
                    {shareUrl}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center justify-center w-8 h-8 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                    aria-label="Copia link"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* Permissions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    {share.canWrite ? (
                      <>
                        <Pencil className="h-3.5 w-3.5" />
                        Lettura e scrittura
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        Sola lettura
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleToggleWrite}
                    disabled={working}
                    className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {share.canWrite ? "Passa a sola lettura" : "Permetti modifiche"}
                  </button>
                </div>

                {/* Revoke */}
                <div className="flex justify-end pt-1 border-t border-border">
                  <button
                    onClick={handleRevoke}
                    disabled={working}
                    className="flex items-center gap-1.5 text-xs text-destructive hover:opacity-80 transition-opacity disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Revoca link
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <MealPlannerGrid />
    </div>
  );
}
