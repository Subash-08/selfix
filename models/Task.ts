import mongoose, { Schema, Model, Document } from "mongoose";

export interface ITask extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  date: string; // "YYYY-MM-DD"
  completed: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    date: { type: String, required: true }, // stored as "YYYY-MM-DD"
    completed: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

taskSchema.index({ userId: 1, date: 1 });

const Task: Model<ITask> = mongoose.models?.Task || mongoose.model<ITask>("Task", taskSchema);

export default Task;
