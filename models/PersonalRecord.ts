import mongoose, { Schema } from "mongoose";

const PersonalRecordSchema = new Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  distanceMeters: { type: Number, required: true },
  elapsedTime: { type: Number, required: true }, // secondi
  activityName: { type: String, default: "" },
  raceDate: { type: String, default: "" }, // YYYY-MM-DD
});

PersonalRecordSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.models.PersonalRecord ||
  mongoose.model("PersonalRecord", PersonalRecordSchema);
