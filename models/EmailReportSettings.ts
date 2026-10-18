import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEmailReportSettings extends Document {
  userId: string;
  reportEnabled: boolean;
  reportRecipients: string[];
  reportFrequency: "weekly";
  reportDayOfWeek: number; // 0=Sunday … 6=Saturday, used only for weekly
  reportLastSentAt: Date | null;
  reportLastTestAt: Date | null; // manual "send now", rate-limited
  updatedAt: Date;
}

const EmailReportSettingsSchema = new Schema<IEmailReportSettings>(
  {
    userId: { type: String, required: true, unique: true },
    reportEnabled: { type: Boolean, default: false },
    reportRecipients: { type: [String], default: [] },
    reportFrequency: { type: String, enum: ["weekly"], default: "weekly" },
    reportDayOfWeek: { type: Number, default: 1 }, // Monday
    reportLastSentAt: { type: Date, default: null },
    reportLastTestAt: { type: Date, default: null },
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
