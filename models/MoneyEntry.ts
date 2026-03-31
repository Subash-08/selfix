import mongoose, { Schema, Model } from "mongoose";
import { IMoneyEntry } from "@/types";

const moneyEntrySchema = new Schema<IMoneyEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    amount: { type: Number, required: true }, // in paise
    type: { type: String, enum: ["expense", "income"], required: true },
    paymentMode: { type: String, enum: ["cash", "upi", "card", "bank"], required: true },
    category: { type: String, required: true },
    subcategory: { type: String },
    note: { type: String },
    isRecurring: { type: Boolean, default: false },
    recurringId: { type: Schema.Types.ObjectId },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

moneyEntrySchema.index({ userId: 1, date: -1 });
moneyEntrySchema.index({ userId: 1, type: 1, date: -1 });

const MoneyEntry: Model<IMoneyEntry> = mongoose.models?.MoneyEntry || mongoose.model<IMoneyEntry>("MoneyEntry", moneyEntrySchema);
export default MoneyEntry;
