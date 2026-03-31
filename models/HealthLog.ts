import mongoose, { Schema, Model } from "mongoose";
import { IHealthLog } from "@/types";

const healthLogSchema = new Schema<IHealthLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    water: {
      logged: { type: Number, default: 0 },
      goal: { type: Number, required: true },
    },
    sleep: {
      bedtime: { type: String },
      wakeTime: { type: String },
      quality: { type: Number, min: 1, max: 5 },
      durationMinutes: { type: Number },
    },
    workout: [
      {
        type: { type: String },
        duration: { type: Number },
        sets: { type: Number },
        reps: { type: Number },
        weight: { type: Number },
        notes: { type: String },
      },
    ],
    steps: {
      count: { type: Number, default: 0 },
      goal: { type: Number, required: true },
    },
    calories: {
      consumed: { type: Number, default: 0 },
      goal: { type: Number, required: true },
    },
    meals: [
      {
        name: { type: String },
        calories: { type: Number },
        protein: { type: Number },
        carbs: { type: Number },
        fat: { type: Number },
        time: { type: String },
      },
    ],
    bodyMetrics: {
      weight: { type: Number },
      unit: { type: String, enum: ["kg", "lbs"], default: "kg" },
    },
  },
  { timestamps: false }
);

healthLogSchema.index({ userId: 1, date: -1 });

const HealthLog: Model<IHealthLog> = mongoose.models?.HealthLog || mongoose.model<IHealthLog>("HealthLog", healthLogSchema);
export default HealthLog;
