import mongoose, { Schema, Model } from "mongoose";
import { ISavingsGoal } from "@/types";

const savingsGoalSchema = new Schema<ISavingsGoal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    targetAmount: { type: Number, required: true }, // in paise
    currentAmount: { type: Number, default: 0 }, // in paise
    deadline: { type: Date },
    category: { type: String },
    completed: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

savingsGoalSchema.index({ userId: 1 });

const SavingsGoal: Model<ISavingsGoal> = mongoose.models?.SavingsGoal || mongoose.model<ISavingsGoal>("SavingsGoal", savingsGoalSchema);
export default SavingsGoal;
