import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHabitCheckin extends Document {
  userId: string;
  habitId: string;
  date: Date;
  createdAt: Date;
}

const HabitCheckinSchema = new Schema<IHabitCheckin>(
  {
    userId: { type: String, required: true },
    habitId: { type: String, required: true },
    date: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

HabitCheckinSchema.index({ habitId: 1, date: 1 }, { unique: true });

const HabitCheckin: Model<IHabitCheckin> =
  mongoose.models.HabitCheckin ||
  mongoose.model<IHabitCheckin>("HabitCheckin", HabitCheckinSchema);

export default HabitCheckin;
