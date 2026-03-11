import mongoose, { Schema, Model } from "mongoose";

export interface IStravaUpdate {
  aspect_type: string;
  event_time: number;
  object_id: number;
  object_type: string;
  owner_id: number; // = athleteId
  subscription_id: number;
  updates: unknown;
  createdAt: Date;
}

const StravaUpdateSchema = new Schema<IStravaUpdate>(
  {
    aspect_type: { type: String, required: true },
    event_time: { type: Number, required: true },
    object_id: { type: Number, required: true },
    object_type: { type: String, required: true },
    owner_id: { type: Number, required: true },
    subscription_id: { type: Number, required: true },
    updates: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

const StravaUpdate: Model<IStravaUpdate> =
  mongoose.models.StravaUpdate ||
  mongoose.model<IStravaUpdate>("StravaUpdate", StravaUpdateSchema);

export default StravaUpdate;
