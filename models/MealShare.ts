import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMealShare extends Document {
  userId: string;
  token: string;
  canWrite: boolean;
  createdAt: Date;
}

const MealShareSchema = new Schema<IMealShare>(
  {
    userId: { type: String, required: true },
    token: { type: String, required: true },
    canWrite: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

MealShareSchema.index({ token: 1 }, { unique: true });
MealShareSchema.index({ userId: 1 }, { unique: true });

const MealShare: Model<IMealShare> =
  mongoose.models.MealShare ||
  mongoose.model<IMealShare>("MealShare", MealShareSchema);

export default MealShare;
