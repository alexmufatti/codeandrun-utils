function getMondayOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

interface Props {
  history: string[];
  color: string;
  weeks?: number;
  onToggle?: (date: string) => void;
  pendingDate?: string | null;
}

export default function HabitHeatmap({ history, color, weeks = 53, onToggle, pendingDate }: Props) {
  const doneDates = new Set(history);
  const todayStr = toDateStr(new Date());
  const weekStart = getMondayOfWeek(new Date());
  const historyStart = new Date(weekStart);
  historyStart.setUTCDate(historyStart.getUTCDate() - (weeks - 1) * 7);

  const columns = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(historyStart);
      date.setUTCDate(date.getUTCDate() + w * 7 + d);
      return toDateStr(date);
    })
  );

  return (
    <div
      className="grid gap-[2px] w-full h-16 sm:h-20"
      style={{
        gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`,
        gridTemplateRows: "repeat(7, minmax(0, 1fr))",
        gridAutoFlow: "column",
      }}
    >
      {columns.map((column, i) =>
        column.map((dateStr) => {
          const isFuture = dateStr > todayStr;
          const isDone = doneDates.has(dateStr);
          const isPending = pendingDate === dateStr;
          const clickable = !!onToggle && !isFuture;
          return (
            <button
              key={`${i}-${dateStr}`}
              type="button"
              disabled={!clickable || isPending}
              onClick={clickable ? () => onToggle!(dateStr) : undefined}
              title={isFuture ? undefined : dateStr}
              // Cells are a few px wide — too small to hit reliably with a
              // finger, so editing here is desktop-only; mobile users edit
              // via the day-of-week row above instead.
              className={`rounded-[1px] p-0 border-0 ${clickable ? "pointer-events-none sm:pointer-events-auto sm:cursor-pointer sm:hover:ring-1 sm:hover:ring-foreground/40" : ""} ${isPending ? "opacity-50" : ""}`}
              style={{
                backgroundColor: isFuture ? "transparent" : isDone ? color : "var(--muted)",
              }}
            />
          );
        })
      )}
    </div>
  );
}
