"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

type PR = {
  _id?: string;
  name: string;
  distanceMeters: number;
  elapsedTime: number;
  activityName: string;
  raceDate: string;
};

const FEATURED = ["5k", "10k", "15k", "Half-Marathon", "30k", "Marathon"];

const KNOWN_DISTANCES: Record<string, number> = {
  "5k": 5000,
  "10k": 10000,
  "15k": 15000,
  "20k": 20000,
  "Half-Marathon": 21097,
  "30k": 30000,
  "Marathon": 42195,
};

const DISTANCE_OPTIONS = [...Object.keys(KNOWN_DISTANCES), "Personalizzata"];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatPace(distanceMeters: number, seconds: number): string {
  const paceSecPerKm = (seconds / distanceMeters) * 1000;
  const pm = Math.floor(paceSecPerKm / 60);
  const ps = Math.round(paceSecPerKm % 60);
  return `${pm}:${String(ps).padStart(2, "0")} /km`;
}

function parseTimeInput(s: string): number | null {
  const parts = s.trim().split(":").map(Number);
  if (parts.some((p) => isNaN(p) || p < 0)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

type ModalState = {
  selectName: string;
  customName: string;
  customKm: string;
  timeInput: string;
  activityName: string;
  raceDate: string;
};

const EMPTY_FORM: ModalState = {
  selectName: "5k",
  customName: "",
  customKm: "",
  timeInput: "",
  activityName: "",
  raceDate: "",
};

export default function PersonalRecordsManager() {
  const [records, setRecords] = useState<PR[]>([]);
  const [editing, setEditing] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/strava/stats/personal-records")
      .then((r) => r.json())
      .then((data) => setRecords(Array.isArray(data) ? data : []));
  }, []);

  const openAdd = () => {
    setEditingName(null);
    setModal({ ...EMPTY_FORM });
  };

  const openEdit = (pr: PR) => {
    const isKnown = pr.name in KNOWN_DISTANCES;
    setEditingName(pr.name);
    setModal({
      selectName: isKnown ? pr.name : "Personalizzata",
      customName: isKnown ? "" : pr.name,
      customKm: isKnown ? "" : String(pr.distanceMeters / 1000),
      timeInput: formatTime(pr.elapsedTime),
      activityName: pr.activityName ?? "",
      raceDate: pr.raceDate ?? "",
    });
  };

  const deletePr = async (name: string) => {
    await fetch(`/api/strava/stats/personal-records?name=${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
    setRecords((prev) => prev.filter((r) => r.name !== name));
    toast.success("Record eliminato");
  };

  const saveModal = async () => {
    if (!modal) return;
    const isCustom = modal.selectName === "Personalizzata";
    const name = isCustom ? modal.customName.trim() : modal.selectName;
    if (!name) { toast.error("Inserisci il nome della distanza"); return; }

    const distanceMeters = isCustom
      ? Math.round(parseFloat(modal.customKm) * 1000)
      : KNOWN_DISTANCES[name];
    if (!distanceMeters || isNaN(distanceMeters)) { toast.error("Inserisci una distanza valida"); return; }

    const elapsedTime = parseTimeInput(modal.timeInput);
    if (!elapsedTime) { toast.error("Formato tempo non valido (es. 45:30 o 1:45:30)"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/strava/stats/personal-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          distanceMeters,
          elapsedTime,
          activityName: modal.activityName,
          raceDate: modal.raceDate,
        }),
      });
      const saved = await res.json();
      if (!res.ok) throw new Error(saved.error);
      setRecords((prev) => {
        const without = prev.filter((r) => r.name !== name && r.name !== editingName);
        return [...without, saved].sort((a, b) => a.distanceMeters - b.distanceMeters);
      });
      setModal(null);
      toast.success(editingName ? "Record aggiornato" : "Record aggiunto");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const featured = records.filter((r) => FEATURED.includes(r.name));
  const rest = records.filter((r) => !FEATURED.includes(r.name));

  if (!records.length && !editing) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Nessun record personale inserito.</p>
        <button
          onClick={() => { setEditing(true); openAdd(); }}
          className="text-sm font-semibold text-[#FC4C02] hover:opacity-80 transition-opacity"
        >
          + Aggiungi
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold">Record personali</h2>
        <div className="flex gap-3">
          {editing && (
            <button
              onClick={openAdd}
              className="text-xs font-semibold text-[#FC4C02] hover:opacity-80 transition-opacity"
            >
              + Aggiungi
            </button>
          )}
          <button
            onClick={() => setEditing((e) => !e)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {editing ? "Fine" : "Modifica"}
          </button>
        </div>
      </div>

      {/* Card distanze principali */}
      {featured.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border">
          {featured.map((pr) => (
            <div key={pr.name} className="relative bg-card px-5 py-4 space-y-1">
              {editing && (
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => openEdit(pr)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                    title="Modifica"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deletePr(pr.name)}
                    className="text-xs text-muted-foreground hover:text-destructive leading-none"
                    title="Elimina"
                  >
                    ×
                  </button>
                </div>
              )}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {pr.name}
              </p>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {formatTime(pr.elapsedTime)}
              </p>
              {pr.distanceMeters > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatPace(pr.distanceMeters, pr.elapsedTime)}
                </p>
              )}
              {pr.raceDate && (
                <p className="text-xs text-muted-foreground">
                  {new Date(pr.raceDate).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
              {pr.activityName && (
                <p className="text-xs text-foreground/70 truncate" title={pr.activityName}>
                  {pr.activityName}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tabella distanze secondarie */}
      {rest.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wide border-t border-border">
                <th className="px-5 py-3 text-left font-medium">Distanza</th>
                <th className="px-5 py-3 text-right font-medium">Tempo</th>
                <th className="px-5 py-3 text-right font-medium hidden sm:table-cell">Passo</th>
                <th className="px-5 py-3 text-left font-medium hidden md:table-cell">Gara</th>
                <th className="px-5 py-3 text-right font-medium hidden md:table-cell">Data</th>
                {editing && <th className="px-3 py-3 w-16"></th>}
              </tr>
            </thead>
            <tbody>
              {rest.map((pr, i) => (
                <tr
                  key={pr.name}
                  className={`border-t border-border/60 hover:bg-muted/30 transition-colors ${
                    i % 2 === 0 ? "" : "bg-muted/10"
                  }`}
                >
                  <td className="px-5 py-2.5 font-medium">{pr.name}</td>
                  <td className="px-5 py-2.5 text-right font-semibold tabular-nums">
                    {formatTime(pr.elapsedTime)}
                  </td>
                  <td className="px-5 py-2.5 text-right text-muted-foreground hidden sm:table-cell">
                    {pr.distanceMeters > 0 ? formatPace(pr.distanceMeters, pr.elapsedTime) : "—"}
                  </td>
                  <td
                    className="px-5 py-2.5 text-muted-foreground hidden md:table-cell max-w-[200px] truncate"
                    title={pr.activityName}
                  >
                    {pr.activityName || "—"}
                  </td>
                  <td className="px-5 py-2.5 text-right text-muted-foreground hidden md:table-cell">
                    {pr.raceDate
                      ? new Date(pr.raceDate).toLocaleDateString("it-IT", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  {editing && (
                    <td className="px-3 py-2.5">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => openEdit(pr)}
                          className="text-muted-foreground hover:text-foreground text-xs"
                          title="Modifica"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deletePr(pr.name)}
                          className="text-muted-foreground hover:text-destructive"
                          title="Elimina"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal add/edit */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-lg border border-border shadow-lg p-6 w-full max-w-sm mx-4 space-y-4">
            <h2 className="text-base font-semibold">
              {editingName ? "Modifica record" : "Aggiungi record"}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Distanza
                </label>
                <select
                  value={modal.selectName}
                  onChange={(e) => setModal((m) => m && { ...m, selectName: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {DISTANCE_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {modal.selectName === "Personalizzata" && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      placeholder="es. 8k"
                      value={modal.customName}
                      onChange={(e) => setModal((m) => m && { ...m, customName: e.target.value })}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Km
                    </label>
                    <input
                      type="number"
                      placeholder="8"
                      value={modal.customKm}
                      onChange={(e) => setModal((m) => m && { ...m, customKm: e.target.value })}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Tempo
                </label>
                <input
                  type="text"
                  placeholder="MM:SS o H:MM:SS"
                  value={modal.timeInput}
                  onChange={(e) => setModal((m) => m && { ...m, timeInput: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Gara (opzionale)
                </label>
                <input
                  type="text"
                  placeholder="es. Maratona di Milano"
                  value={modal.activityName}
                  onChange={(e) => setModal((m) => m && { ...m, activityName: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Data (opzionale)
                </label>
                <input
                  type="date"
                  value={modal.raceDate}
                  onChange={(e) => setModal((m) => m && { ...m, raceDate: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={saveModal}
                disabled={saving}
                className="flex-1 rounded-md bg-[#FC4C02] px-4 py-2 text-sm font-medium text-white hover:bg-[#e04400] transition-colors disabled:opacity-40"
              >
                {saving ? "Salvataggio..." : "Salva"}
              </button>
              <button
                onClick={() => setModal(null)}
                className="flex-1 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
