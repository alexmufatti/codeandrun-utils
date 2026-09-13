import mongoose, { Schema, Document, Model } from "mongoose";
import { HABIT_COLORS } from "@/lib/habits/colors";

export type HabitKind = "manual" | "strava";

export const STRAVA_HABIT_TYPES = [
  "Run",
  "Ride",
  "WeightTraining",
  "Walk",
  "Swim",
  "Hike",
  "Yoga",
] as const;

export { HABIT_COLORS };

export interface IHabit extends Document {
  userId: string;
  name: string;
  kind: HabitKind;
  stravaType?: string;
  targetPerWeek: number;
  color: string;
  order: number;
  archived: boolean;
  createdAt: Date;
}

const HabitSchema = new Schema<IHabit>(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    kind: { type: String, required: true, enum: ["manual", "strava"] },
    stravaType: { type: String, enum: STRAVA_HABIT_TYPES },
    targetPerWeek: { type: Number, required: true, min: 1, max: 14 },
    color: { type: String, enum: HABIT_COLORS, default: HABIT_COLORS[0] },
    order: { type: Number, required: true, default: 0 },
    archived: { type: Boolean, required: true, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

HabitSchema.index({ userId: 1, archived: 1, order: 1 });

const Habit: Model<IHabit> =
  mongoose.models.Habit || mongoose.model<IHabit>("Habit", HabitSchema);

export default Habit;
