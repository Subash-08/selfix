import mongoose, { Schema, Model } from "mongoose";
import { IMobileAppUsage } from "@/types";

const mobileAppUsageSchema = new Schema<IMobileAppUsage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    appName: { type: String, required: true },
    usageMinutes: { type: Number, required: true },
    goalMinutes: { type: Number, required: true },
    withinGoal: { type: Boolean, required: true },
  },
  { timestamps: false }
);

mobileAppUsageSchema.index({ userId: 1, date: -1 });

const MobileAppUsage: Model<IMobileAppUsage> = mongoose.models?.MobileAppUsage || mongoose.model<IMobileAppUsage>("MobileAppUsage", mobileAppUsageSchema);
export default MobileAppUsage;
