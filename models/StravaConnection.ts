import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStravaConnection extends Document {
  userId: string;
  athleteId: number;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix timestamp (seconds)
  athleteFirstname: string;
  athleteLastname: string;
}

const StravaConnectionSchema = new Schema<IStravaConnection>(
  {
    userId: { type: String, required: true, unique: true },
    athleteId: { type: Number, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt: { type: Number, required: true },
    athleteFirstname: { type: String, default: "" },
    athleteLastname: { type: String, default: "" },
  },
  { versionKey: false }
);

StravaConnectionSchema.index({ athleteId: 1 });

const StravaConnection: Model<IStravaConnection> =
  mongoose.models.StravaConnection ||
  mongoose.model<IStravaConnection>("StravaConnection", StravaConnectionSchema);

export default StravaConnection;
