import mongoose, { Schema } from "mongoose";

const HrvEntrySchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    calendarDate: { type: String, required: true },
    weeklyAvg: { type: Number, default: null },
    lastNightAvg: { type: Number, default: null },
    lastNight5MinHigh: { type: Number, default: null },
    baseline: {
      balancedLow: { type: Number, default: null },
      balancedUpper: { type: Number, default: null },
    },
    status: { type: String, default: null },
    feedbackPhrase: { type: String, default: null },
    createTimeStamp: { type: String, default: null },
  },
  { strict: false }
);

HrvEntrySchema.index({ userId: 1, calendarDate: 1 }, { unique: true });

export default mongoose.models.HrvEntry ||
  mongoose.model("HrvEntry", HrvEntrySchema);
