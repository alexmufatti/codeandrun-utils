"use client";

import { useState, useEffect, useCallback } from "react";
import { Pencil, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import { interpolate } from "@/lib/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HABIT_COLORS } from "@/lib/habits/colors";
import HabitHeatmap from "./HabitHeatmap";

const STRAVA_TYPE_LABELS: Record<string, string> = {
  Run: "Corsa",
  Ride: "Ciclismo",
  WeightTraining: "Pesi",
  Walk: "Camminata",
  Swim: "Nuoto",
  Hike: "Escursione",
  Yoga: "Yoga",
};

type HabitKind = "manual" | "strava";

interface Habit {
  _id: string;
  name: string;
  kind: HabitKind;
  stravaType?: string;
  targetPerWeek: number;
  color: string;
  progress: number;
  checkedDates?: string[];
  history: string[];
}

interface FormState {
  name: string;
  kind: HabitKind;
  stravaType: string;
  targetPerWeek: string;
  color: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  kind: "manual",
  stravaType: "Run",
  targetPerWeek: "3",
  color: HABIT_COLORS[0],
};

function getMondayOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function HabitsPageClient() {
  const { t } = useTranslations();
  const [habits, setHabits] = useState<Habit[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [pendingCheckin, setPendingCheckin] = useState<string | null>(null);

  const loadHabits = useCallback(async () => {
    try {
      const res = await fetch("/api/habits");
      if (!res.ok) throw new Error();
      setHabits(await res.json());
    } catch {
      toast.error(t.habits.loadError);
    }
  }, [t]);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = getMondayOfWeek(new Date());
    d.setUTCDate(d.getUTCDate() + i);
    return toDateStr(d);
  });
  const todayStr = toDateStr(new Date());

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEditForm = (habit: Habit) => {
    setEditingId(habit._id);
    setForm({
      name: habit.name,
      kind: habit.kind,
      stravaType: habit.stravaType ?? "Run",
      targetPerWeek: String(habit.targetPerWeek),
      color: habit.color,
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetPerWeek = parseInt(form.targetPerWeek, 10);
    if (!form.name.trim() || isNaN(targetPerWeek) || targetPerWeek < 1 || targetPerWeek > 14) {
      toast.error(t.habits.saveError);
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/habits/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name.trim(), targetPerWeek, color: form.color }),
        });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch("/api/habits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            kind: form.kind,
            stravaType: form.kind === "strava" ? form.stravaType : undefined,
            targetPerWeek,
            color: form.color,
          }),
        });
        if (!res.ok) throw new Error();
      }
      setFormOpen(false);
      await loadHabits();
    } catch {
      toast.error(t.habits.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.habits.deleteConfirm)) return;
    try {
      const res = await fetch(`/api/habits/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setHabits((prev) => prev?.filter((h) => h._id !== id) ?? null);
    } catch {
      toast.error(t.habits.deleteError);
    }
  };

  const handleToggleCheckin = async (habitId: string, date: string) => {
    setPendingCheckin(`${habitId}-${date}`);
    try {
      const res = await fetch(`/api/habits/${habitId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) throw new Error();
      const { done } = await res.json();
      const inCurrentWeek = weekDates.includes(date);
      setHabits(
        (prev) =>
          prev?.map((h) => {
            if (h._id !== habitId) return h;
            const checkedDates = new Set(h.checkedDates ?? []);
            const history = new Set(h.history);
            if (done) {
              history.add(date);
              if (inCurrentWeek) checkedDates.add(date);
            } else {
              history.delete(date);
              if (inCurrentWeek) checkedDates.delete(date);
            }
            return {
              ...h,
              checkedDates: [...checkedDates],
              history: [...history].sort(),
              progress: checkedDates.size,
            };
          }) ?? null
      );
    } catch {
      toast.error(t.habits.saveError);
    } finally {
      setPendingCheckin(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t.habits.title}</h1>
        <Button size="sm" onClick={() => (formOpen ? setFormOpen(false) : openCreateForm())}>
          {t.habits.addBtn}
        </Button>
      </div>

      {formOpen && (
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="habit-name">{t.habits.nameLabel}</Label>
                <Input
                  id="habit-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t.habits.namePlaceholder}
                  maxLength={80}
                  required
                />
              </div>

              {!editingId && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="habit-kind">{t.habits.kindLabel}</Label>
                  <select
                    id="habit-kind"
                    value={form.kind}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, kind: e.target.value as HabitKind }))
                    }
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="manual">{t.habits.kindManual}</option>
                    <option value="strava">{t.habits.kindStrava}</option>
                  </select>
                </div>
              )}

              {!editingId && form.kind === "strava" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="habit-strava-type">{t.habits.stravaTypeLabel}</Label>
                  <select
                    id="habit-strava-type"
                    value={form.stravaType}
                    onChange={(e) => setForm((f) => ({ ...f, stravaType: e.target.value }))}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    {Object.entries(STRAVA_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label>{t.habits.colorLabel}</Label>
                <div className="flex gap-2">
                  {HABIT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      aria-label={c}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        form.color === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="habit-target">{t.habits.targetLabel}</Label>
                <Input
                  id="habit-target"
                  type="number"
                  min={1}
                  max={14}
                  value={form.targetPerWeek}
                  onChange={(e) => setForm((f) => ({ ...f, targetPerWeek: e.target.value }))}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setFormOpen(false)}>
                  {t.habits.cancelBtn}
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? t.habits.savingBtn : t.habits.saveBtn}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {habits === null ? (
        <p className="text-sm text-muted-foreground">{t.auth.loading}</p>
      ) : habits.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.habits.emptyState}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {habits.map((habit) => {
            const pct = Math.min(100, Math.round((habit.progress / habit.targetPerWeek) * 100));
            return (
              <Card key={habit._id}>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{habit.name}</span>
                        {habit.kind === "strava" && (
                          <Zap className="h-3.5 w-3.5" style={{ color: habit.color }} />
                        )}
                      </div>
                      {habit.kind === "strava" && (
                        <span className="text-xs text-muted-foreground">
                          {t.habits.autoFromStrava} · {STRAVA_TYPE_LABELS[habit.stravaType!] ?? habit.stravaType}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditForm(habit)}
                        className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label={t.habits.editBtn}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(habit._id)}
                        className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                        aria-label={t.habits.deleteBtn}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: habit.color }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {interpolate(t.habits.progressLabel, {
                        done: habit.progress,
                        target: habit.targetPerWeek,
                      })}
                    </span>
                  </div>

                  {habit.kind === "manual" && (
                    <div className="flex gap-1.5">
                      {weekDates.map((date, i) => {
                        const checked = habit.checkedDates?.includes(date) ?? false;
                        const isFuture = date > todayStr;
                        const key = `${habit._id}-${date}`;
                        return (
                          <button
                            key={date}
                            disabled={isFuture || pendingCheckin === key}
                            onClick={() => handleToggleCheckin(habit._id, date)}
                            className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-md border text-xs transition-colors disabled:opacity-40 ${
                              checked ? "" : "border-border text-muted-foreground hover:bg-muted"
                            } ${date === todayStr ? "ring-1" : ""}`}
                            style={
                              checked
                                ? { backgroundColor: `${habit.color}26`, borderColor: `${habit.color}66`, color: habit.color }
                                : date === todayStr
                                  ? ({ "--tw-ring-color": `${habit.color}66` } as React.CSSProperties)
                                  : undefined
                            }
                          >
                            <span className="font-semibold uppercase">{t.habits.dayLabels[i]}</span>
                            <span>{checked ? "✓" : "·"}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <HabitHeatmap
                    history={habit.history}
                    color={habit.color}
                    onToggle={
                      habit.kind === "manual"
                        ? (date) => handleToggleCheckin(habit._id, date)
                        : undefined
                    }
                    pendingDate={
                      pendingCheckin?.startsWith(`${habit._id}-`)
                        ? pendingCheckin.slice(habit._id.length + 1)
                        : null
                    }
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
