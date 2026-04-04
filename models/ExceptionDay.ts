import mongoose from 'mongoose';

const ExceptionDaySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD'
  reason: { type: String, default: '' }, // e.g. 'holiday', 'sick'
  skipAllTasks: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

ExceptionDaySchema.index({ userId: 1, date: 1 }, { unique: true });

export const ExceptionDay = mongoose.models.ExceptionDay || mongoose.model('ExceptionDay', ExceptionDaySchema);
