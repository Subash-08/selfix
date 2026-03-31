import mongoose, { Schema, Model } from "mongoose";
import { IRecurringExpense } from "@/types";

const recurringExpenseSchema = new Schema<IRecurringExpense>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    paymentMode: { type: String, required: true },
    frequency: { type: String, enum: ["daily", "weekly", "monthly"], required: true },
    dayOfMonth: { type: Number },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

recurringExpenseSchema.index({ userId: 1 });

const RecurringExpense: Model<IRecurringExpense> = mongoose.models?.RecurringExpense || mongoose.model<IRecurringExpense>("RecurringExpense", recurringExpenseSchema);
export default RecurringExpense;
