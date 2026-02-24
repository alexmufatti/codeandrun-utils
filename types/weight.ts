export interface WeightEntry {
  _id?: string;
  userId: string;
  date: string; // ISO date string YYYY-MM-DD
  weightKg: number;
  createdAt?: string;
}

export interface UserSettings {
  _id?: string;
  userId: string;
  targetWeightKg: number | null;
  updatedAt?: string;
}

export interface WeightStats {
  current: number | null;
  min: number | null;
  max: number | null;
  avg: number | null;
  trend: "rising" | "stable" | "falling" | null;
  deltaFromTarget: number | null;
}

export type PeriodDays = 30 | 90 | 365;
