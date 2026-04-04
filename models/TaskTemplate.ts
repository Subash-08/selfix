import mongoose from 'mongoose';

const TaskTemplateSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  icon: { type: String, default: '✅' },
  color: { type: String, default: '#3b82f6' },
  category: { 
    type: String, 
    enum: ['work', 'learning', 'health', 'personal', 'custom'],
    default: 'custom'
  },
  mode: { type: String, enum: ['target-min', 'target-max'], default: 'target-min' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  targetDuration: { type: Number, default: 0 }, // 0 = simple checkbox
  recurrence: {
    type: { type: String, enum: ['daily', 'weekdays', 'custom'], default: 'daily' },
    weekdays: { type: [Number], default: [] }, // 0 = Sunday, 1 = Monday, etc.
    interval: { type: Number, default: 1 } // every N days
  },
  active: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  archivedAt: { type: Date, default: null }
}, { timestamps: true });

TaskTemplateSchema.index({ userId: 1, active: 1, isDeleted: 1 });

export const TaskTemplate = mongoose.models.TaskTemplate || mongoose.model('TaskTemplate', TaskTemplateSchema);
