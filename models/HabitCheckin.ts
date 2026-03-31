import mongoose, { Schema, Model } from "mongoose";
import { IHabitCheckin } from "@/types";

const habitCheckinSchema = new Schema<IHabitCheckin>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    habitId: { type: Schema.Types.ObjectId, ref: "Habit", required: true },
    date: { type: Date, required: true },
    completed: { type: Boolean, default: false },
    note: { type: String },
    skipped: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: false }
);

habitCheckinSchema.index({ userId: 1, date: -1 });
habitCheckinSchema.index({ userId: 1, habitId: 1, date: -1 });

const HabitCheckin: Model<IHabitCheckin> = mongoose.models?.HabitCheckin || mongoose.model<IHabitCheckin>("HabitCheckin", habitCheckinSchema);
export default HabitCheckin;
