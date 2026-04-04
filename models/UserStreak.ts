import mongoose from 'mongoose';

const UserStreakSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastCompletedDate: { type: String, default: null }, // 'YYYY-MM-DD'
}, { timestamps: true });

export const UserStreak = mongoose.models.UserStreak || mongoose.model('UserStreak', UserStreakSchema);
