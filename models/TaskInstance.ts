import mongoose from 'mongoose';

const TaskInstanceSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD' in user local time

  // snapshot fields
  name: { type: String, required: true },
  icon: { type: String, default: '✅' },
  color: { type: String, default: '#3b82f6' },
  category: { type: String, default: 'custom' },
  mode: { type: String, enum: ['target-min', 'target-max'], default: 'target-min' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  targetDuration: { type: Number, default: 0 },
  unit: { type: String, default: 'minutes' }, // Future proofing

  // tracking
  loggedTime: { type: Number, default: 0 },

  progress: { type: Number, default: 0 }, // 0-100 logically
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'skipped'],
    default: 'not_started'
  },
  notes: { type: String, default: '' },

  // meta
  origin: { type: String, enum: ['template', 'copied', 'manual'], default: 'manual' },
  baseTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'TaskTemplate', default: null },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template', default: null },
  templateName: { type: String, default: null },
  isCustom: { type: Boolean, default: false },

  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// Performance index + prevent identical name on the same day for a user
TaskInstanceSchema.index({ userId: 1, date: 1, name: 1 }, { unique: true });
TaskInstanceSchema.index({ userId: 1, date: 1 });

export const TaskInstance = mongoose.models.TaskInstance || mongoose.model('TaskInstance', TaskInstanceSchema);
