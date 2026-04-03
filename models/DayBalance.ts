import mongoose, { Schema, Model } from "mongoose";
import { IDayBalance } from "@/types";

const dayBalanceSchema = new Schema<IDayBalance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    openingCash: { type: Number, default: 0 },
    openingUPI: { type: Number, default: 0 },
    closingCashActual: { type: Number, default: null },
    closingUPIActual: { type: Number, default: null },
    carryForward: { type: Boolean, default: false },
    note: { type: String },
    tallyNote: { type: String },
  },
  { timestamps: true }
);

dayBalanceSchema.index({ userId: 1, date: 1 }, { unique: true });

const DayBalance: Model<IDayBalance> = mongoose.models?.DayBalance || mongoose.model<IDayBalance>("DayBalance", dayBalanceSchema);
export default DayBalance;
