import type { Split } from "@/types/pace";
import { cn } from "@/lib/utils";

interface PaceSplitsProps {
  splits: Split[];
}

export default function PaceSplits({ splits }: PaceSplitsProps) {
  if (splits.length === 0) return null;

  return (
    <div
      className={cn(
        "overflow-auto rounded-lg border border-border",
        splits.length > 15 ? "max-h-96" : undefined
      )}
    >
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground w-16">#</th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Split</th>
            <th className="px-4 py-2 text-right font-medium text-muted-foreground">Cumulativo</th>
          </tr>
        </thead>
        <tbody>
          {splits.map((split, i) => (
            <tr
              key={i}
              className={cn(
                "border-t border-border",
                split.isPartial
                  ? "bg-primary/5 font-medium text-primary"
                  : "hover:bg-muted/50"
              )}
            >
              <td className="px-4 py-2 text-muted-foreground">
                {split.isPartial ? "~" : i + 1}
              </td>
              <td className="px-4 py-2 text-right font-mono">{split.splitTime}</td>
              <td className="px-4 py-2 text-right font-mono">{split.cumulative}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
