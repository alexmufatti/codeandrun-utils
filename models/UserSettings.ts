import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserSettings extends Document {
  userId: string;
  targetWeightKg: number | null;
  vdotDistanceM: number | null;
  vdotTimeInput: string | null;
  hrMaxBpm: number | null;
  hrRestingBpm: number | null;
  hrZoneMethod: string | null;
  hrSource: string | null;
  hrAge: number | null;
  hrFormula: string | null;
  hrZonePercents: string | null;
  updatedAt: Date;
}

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId: { type: String, required: true, unique: true },
    targetWeightKg: { type: Number, default: null },
    vdotDistanceM: { type: Number, default: null },
    vdotTimeInput: { type: String, default: null },
    hrMaxBpm: { type: Number, default: null },
    hrRestingBpm: { type: Number, default: null },
    hrZoneMethod: { type: String, default: null },
    hrSource: { type: String, default: null },
    hrAge: { type: Number, default: null },
    hrFormula: { type: String, default: null },
    hrZonePercents: { type: String, default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

const UserSettings: Model<IUserSettings> =
  mongoose.models.UserSettings ||
  mongoose.model<IUserSettings>("UserSettings", UserSettingsSchema);

export default UserSettings;
