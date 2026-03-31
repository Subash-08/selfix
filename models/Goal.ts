import mongoose, { Schema, Model } from "mongoose";
import { IGoal } from "@/types";

const goalMilestoneSchema = new Schema(
  {
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    order: { type: Number, required: true },
  },
  { _id: true } // keep _id for milestones
);

const goalSchema = new Schema<IGoal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String },
    category: {
      type: String,
      enum: ["career", "health", "finance", "relationships", "learning", "personal"],
      required: true,
    },
    deadline: { type: Date },
    status: { type: String, enum: ["active", "completed", "archived"], default: "active" },
    milestones: [goalMilestoneSchema],
    tags: [{ type: String }],
    aiSuggested: { type: Boolean, default: false },
    templateId: { type: String },
  },
  { timestamps: true }
);

goalSchema.index({ userId: 1 });

const Goal: Model<IGoal> = mongoose.models?.Goal || mongoose.model<IGoal>("Goal", goalSchema);
export default Goal;
