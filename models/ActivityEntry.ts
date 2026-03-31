import mongoose, { Schema, Model } from "mongoose";
import { IActivityEntry } from "@/types";

const activityEntrySchema = new Schema<IActivityEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    startTime: { type: String },
    endTime: { type: String },
    durationMinutes: { type: Number, required: true },
    isPlanned: { type: Boolean, default: false },
    completedActual: { type: Boolean, default: false },
    pomodoroSessions: { type: Number, default: 0 },
    notes: { type: String },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

activityEntrySchema.index({ userId: 1, date: -1 });

const ActivityEntry: Model<IActivityEntry> = mongoose.models?.ActivityEntry || mongoose.model<IActivityEntry>("ActivityEntry", activityEntrySchema);
export default ActivityEntry;
