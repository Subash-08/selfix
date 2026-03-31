import mongoose, { Schema, Model } from "mongoose";
import { IPomodoroSession } from "@/types";

const pomodoroSessionSchema = new Schema<IPomodoroSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    activityId: { type: Schema.Types.ObjectId, ref: "ActivityEntry" },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    duration: { type: Number, required: true },
    breakDuration: { type: Number, required: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: false }
);

pomodoroSessionSchema.index({ userId: 1, startedAt: -1 });

const PomodoroSession: Model<IPomodoroSession> = mongoose.models?.PomodoroSession || mongoose.model<IPomodoroSession>("PomodoroSession", pomodoroSessionSchema);
export default PomodoroSession;
