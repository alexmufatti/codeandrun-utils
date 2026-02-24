import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWeightEntry extends Document {
  userId: string;
  date: Date;
  weightKg: number;
  createdAt: Date;
}

const WeightEntrySchema = new Schema<IWeightEntry>(
  {
    userId: { type: String, required: true },
    date: { type: Date, required: true },
    weightKg: { type: Number, required: true, min: 30, max: 300 },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

WeightEntrySchema.index({ userId: 1, date: 1 }, { unique: true });

const WeightEntry: Model<IWeightEntry> =
  mongoose.models.WeightEntry ||
  mongoose.model<IWeightEntry>("WeightEntry", WeightEntrySchema);

export default WeightEntry;
