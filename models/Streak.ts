import mongoose, { Schema, Model } from "mongoose";
import { IStreak } from "@/types";

const streakSchema = new Schema<IStreak>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    entityType: {
      type: String,
      enum: ["habit", "journal", "activity", "money", "water", "sleep", "workout"],
      required: true,
    },
    entityId: { type: Schema.Types.ObjectId }, // Only required for habit
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastCheckinDate: { type: Date },
    freezesUsedThisMonth: { type: Number, default: 0 },
  },
  { timestamps: false }
);

streakSchema.index({ userId: 1, entityType: 1, entityId: 1 }, { unique: true });

const Streak: Model<IStreak> = mongoose.models?.Streak || mongoose.model<IStreak>("Streak", streakSchema);
export default Streak;
