import mongoose from 'mongoose';

const TemplateSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  tasks: [{
    name: { type: String, required: true },
    icon: { type: String, default: '✅' },
    color: { type: String, default: '#3b82f6' },
    category: { type: String, default: 'custom' },
    mode: { type: String, enum: ['target-min', 'target-max'], default: 'target-min' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    targetDuration: { type: Number, default: 0 },
    unit: { type: String, default: 'minutes' }
  }],
  usageCount: { type: Number, default: 0 },
  lastUsedAt: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

export const Template = mongoose.models.Template || mongoose.model('Template', TemplateSchema);
