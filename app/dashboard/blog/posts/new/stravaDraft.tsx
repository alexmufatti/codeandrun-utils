"use client";

import { useState } from "react";
import { yamlStr, yamlArray } from "@/lib/posts/buildMdx";
import type { AstroDraft } from "@/lib/strava/astro-draft";

export const TRAINING_TYPE_OPTIONS = ["🟢", "🟡", "🔴", "🏁"];
export const TRAINING_FEELING_OPTIONS = ["😀", "🙂", "😐", "🫤", "🙁", "😭", "☠️"];

export function EmojiPicker({
  value,
  options,
  onChange,
  title,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={title}
        className="w-12 rounded-md border border-border bg-background px-2 py-1 text-sm text-center hover:bg-muted transition-colors"
      >
        {value || "—"}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 right-0 top-full mt-1 w-40 rounded-md border border-border bg-background shadow-lg p-2 space-y-2">
            <div className="flex flex-wrap gap-1">
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={`rounded-md border px-2 py-1 text-sm hover:bg-muted transition-colors ${
                    opt === value ? "border-[#FC4C02]" : "border-border"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="altro..."
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && custom.trim()) {
                  onChange(custom.trim());
                  setCustom("");
                  setOpen(false);
                }
              }}
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </>
      )}
    </div>
  );
}

export function buildDraftMdx(fm: AstroDraft["frontmatter"], activities: AstroDraft["activities"], body: string): string {
  const lines = ["---"];
  lines.push(`title: ${yamlStr(fm.title)}`);
  lines.push(`date: ${fm.date}`);
  lines.push(`excerpt: ${yamlStr(fm.excerpt)}`);
  if (fm.seoDescription) lines.push(`seoDescription: ${yamlStr(fm.seoDescription)}`);
  lines.push(`categories: ${yamlArray(fm.categories)}`);
  if (fm.tags.length) lines.push(`tags: ${yamlArray(fm.tags)}`);
  if (fm.featuredImage) lines.push(`featuredImage: ${yamlStr(fm.featuredImage)}`);
  lines.push(`car_week: ${yamlStr(fm.car_week)}`);
  lines.push(`car_km: ${yamlStr(fm.car_km)}`);
  lines.push(`training_types: ${yamlArray(activities.map((a) => a.trainingType))}`);
  lines.push(`training_feelings: ${yamlArray(activities.map((a) => a.trainingFeeling))}`);
  lines.push("---");
  return `${lines.join("\n")}\n\n${body.trim()}\n`;
}
