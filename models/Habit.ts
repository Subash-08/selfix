import mongoose, { Schema, Model } from "mongoose";
import { IHabit } from "@/types";

const habitSchema = new Schema<IHabit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ["build", "quit"], required: true },
    frequency: {
      type: { type: String, enum: ["daily", "weekly", "custom"], required: true },
      daysOfWeek: [{ type: Number }],
      timesPerWeek: { type: Number },
    },
    category: { type: String, required: true },
    color: { type: String, required: true },
    icon: { type: String, required: true },
    stackGroup: { type: String },
    active: { type: Boolean, default: true },
    archivedAt: { type: Date },
  },
  { timestamps: true }
);

habitSchema.index({ userId: 1 });

const Habit: Model<IHabit> = mongoose.models?.Habit || mongoose.model<IHabit>("Habit", habitSchema);
export default Habit;
