import mongoose, { Schema } from "mongoose";

const StravaEventSchema = new Schema({
  userId: { type: String, required: true, index: true },
  description: { type: String, required: true },
  start_date: { type: String, required: true },
  end_date: { type: String, required: true },
  type: { type: String, default: "" },
});

export default mongoose.models.StravaEvent ||
  mongoose.model("StravaEvent", StravaEventSchema);
