import mongoose, { Schema, Model } from "mongoose";
import { IBudget } from "@/types";

const budgetSchema = new Schema<IBudget>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: String, required: true }, // YYYY-MM
    category: { type: String, required: true },
    amount: { type: Number, required: true }, // in paise
  },
  { timestamps: true }
);

budgetSchema.index({ userId: 1, month: 1, category: 1 }, { unique: true });

const Budget: Model<IBudget> = mongoose.models?.Budget || mongoose.model<IBudget>("Budget", budgetSchema);
export default Budget;
