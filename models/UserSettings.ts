import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserSettings extends Document {
  userId: string;
  targetWeightKg: number | null;
  updatedAt: Date;
}

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId: { type: String, required: true, unique: true },
    targetWeightKg: { type: Number, default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

const UserSettings: Model<IUserSettings> =
  mongoose.models.UserSettings ||
  mongoose.model<IUserSettings>("UserSettings", UserSettingsSchema);

export default UserSettings;
