import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEmailReportSettings extends Document {
  userId: string;
  reportEnabled: boolean;
  reportRecipients: string[];
  reportFrequency: "daily" | "weekly" | "monthly";
  reportDayOfWeek: number; // 0=Sunday … 6=Saturday, used only for weekly
  reportLastSentAt: Date | null;
  updatedAt: Date;
}

const EmailReportSettingsSchema = new Schema<IEmailReportSettings>(
  {
    userId: { type: String, required: true, unique: true },
    reportEnabled: { type: Boolean, default: false },
    reportRecipients: { type: [String], default: [] },
    reportFrequency: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      default: "weekly",
    },
    reportDayOfWeek: { type: Number, default: 1 }, // Monday
    reportLastSentAt: { type: Date, default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

const EmailReportSettings: Model<IEmailReportSettings> =
  mongoose.models.EmailReportSettings ||
  mongoose.model<IEmailReportSettings>(
    "EmailReportSettings",
    EmailReportSettingsSchema
  );

export default EmailReportSettings;
