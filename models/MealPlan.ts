import mongoose, { Schema, Document, Model } from "mongoose";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface IMealPlan extends Document {
  userId: string;
  weekStart: Date;
  day: number;
  mealType: MealType;
  content: string;
  updatedAt: Date;
}

const MealPlanSchema = new Schema<IMealPlan>(
  {
    userId: { type: String, required: true },
    weekStart: { type: Date, required: true },
    day: { type: Number, required: true, min: 0, max: 6 },
    mealType: {
      type: String,
      required: true,
      enum: ["breakfast", "lunch", "dinner", "snack"],
    },
    content: { type: String, default: "" },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

MealPlanSchema.index(
  { userId: 1, weekStart: 1, day: 1, mealType: 1 },
  { unique: true }
);

const MealPlan: Model<IMealPlan> =
  mongoose.models.MealPlan ||
  mongoose.model<IMealPlan>("MealPlan", MealPlanSchema);

export default MealPlan;
