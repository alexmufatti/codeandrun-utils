import mongoose, { Schema } from "mongoose";

const SleepEntrySchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    calendarDate: { type: String, required: true },
    sleepTimeSeconds: { type: Number, default: null },
    deepSleepSeconds: { type: Number, default: null },
    lightSleepSeconds: { type: Number, default: null },
    remSleepSeconds: { type: Number, default: null },
    awakeSleepSeconds: { type: Number, default: null },
    averageSpO2Value: { type: Number, default: null },
    sleepScore: { type: Number, default: null },
    averageRespirationValue: { type: Number, default: null },
    perceivedQuality: { type: Number, default: null },
    awakenings: { type: Number, default: null },
    notes: { type: String, default: null },
  },
  { strict: false }
);

SleepEntrySchema.index({ userId: 1, calendarDate: 1 }, { unique: true });

export default mongoose.models.SleepEntry ||
  mongoose.model("SleepEntry", SleepEntrySchema);
