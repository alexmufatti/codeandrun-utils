"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import HrvChart from "./HrvChart";
import RestHrChart from "./RestHrChart";

export type CalendarEvent = {
  _id: string;
  description: string;
  start_date: string;
  end_date: string;
};

type Tab = "hrv" | "resthr" | "events";

const TABS: { value: Tab; label: string }[] = [
  { value: "hrv", label: "HRV" },
  { value: "resthr", label: "Rest HR" },
  { value: "events", label: "Eventi" },
];

export default function HrvPageClient() {
  const [tab, setTab] = useState<Tab>("hrv");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description: "", start_date: "", end_date: "" });
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async () => {
    const res = await fetch("/api/events");
    if (res.ok) setEvents(await res.json());
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = async () => {
    if (!form.description || !form.start_date || !form.end_date) {
      toast.error("Compila tutti i campi");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setForm({ description: "", start_date: "", end_date: "" });
      setShowForm(false);
      fetchEvents();
    } catch {
      toast.error("Errore durante il salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (id: string) => {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e._id !== id));
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "hrv" && <HrvChart events={events} />}
      {tab === "resthr" && <RestHrChart events={events} />}
      {tab === "events" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Eventi</h3>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showForm ? "Annulla" : "+ Aggiungi"}
            </button>
          </div>

          {showForm && (
            <div className="flex flex-wrap gap-2 mb-6 items-end p-4 rounded-lg border border-border bg-muted/20">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Descrizione</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="es. Gara, Infortunio..."
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-48"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Da</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">A</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                onClick={addEvent}
                disabled={saving}
                className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {saving ? "..." : "Salva"}
              </button>
            </div>
          )}

          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun evento registrato.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Descrizione</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Da</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">A</th>
                    <th className="w-8 px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev, i) => (
                    <tr
                      key={ev._id}
                      className={`border-t border-border ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                    >
                      <td className="px-4 py-2 font-medium">{ev.description}</td>
                      <td className="px-4 py-2 text-muted-foreground">{ev.start_date}</td>
                      <td className="px-4 py-2 text-muted-foreground">{ev.end_date}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => deleteEvent(ev._id)}
                          className="text-muted-foreground/50 hover:text-destructive transition-colors"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
