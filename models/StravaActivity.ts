import mongoose, { Schema, Model } from "mongoose";

// strict: false — store the full Strava activity object as-is,
// with userId and athleteId added as indexed fields.
const StravaActivitySchema = new Schema(
  {
    userId: { type: String, required: true },
    athleteId: { type: Number, required: true },
    id: { type: Number, required: true }, // Strava activity id
  },
  { strict: false, versionKey: false }
);

StravaActivitySchema.index({ id: 1, userId: 1 }, { unique: true });
StravaActivitySchema.index({ userId: 1, start_date: -1 });

const StravaActivity: Model<any> =
  mongoose.models.StravaActivity ||
  mongoose.model("StravaActivity", StravaActivitySchema);

export default StravaActivity;
