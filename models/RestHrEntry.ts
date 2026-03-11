import mongoose, { Schema } from "mongoose";

const RestHrEntrySchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    calendarDate: { type: String, required: true },
    values: {
      restingHR: { type: Number },
      wellnessMaxAvgHR: { type: Number },
      wellnessMinAvgHR: { type: Number },
    },
  },
  { strict: false }
);

RestHrEntrySchema.index({ userId: 1, calendarDate: 1 }, { unique: true });

export default mongoose.models.RestHrEntry ||
  mongoose.model("RestHrEntry", RestHrEntrySchema);
