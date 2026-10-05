export interface Activity {
  id: number;
  name: string;
  start_date_local: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  suffer_score?: number;
  wpPostId?: number;
  wpPostUrl?: string;
  legacyPublished?: boolean;
  astroSlug?: string;
  astroPostUrl?: string;
}

export function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(2) + " km";
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function isoWeek(dateStr: string): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - w1.getTime()) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}
