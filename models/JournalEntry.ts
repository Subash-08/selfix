import mongoose, { Schema, Model } from "mongoose";
import { IJournalEntry } from "@/types";

const journalEntrySchema = new Schema<IJournalEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    rawNotes: { type: String, required: true },
    expandedContent: { type: String },
    mood: { type: Number, min: 1, max: 5, required: true },
    moodEmoji: { type: String, required: true },
    moodNote: { type: String },
    gratitude: [{ type: String }],
    promptAnswers: {
      wentWell: { type: String },
      drained: { type: String },
      tomorrow: { type: String },
    },
    photos: [{ type: String }],
    tags: [{ type: String }],
    aiGenerated: { type: Boolean, default: false },
    wordCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

journalEntrySchema.index({ userId: 1, date: -1 });
// Text index for search functionality
journalEntrySchema.index({ rawNotes: "text", expandedContent: "text", tags: "text" });

const JournalEntry: Model<IJournalEntry> = mongoose.models?.JournalEntry || mongoose.model<IJournalEntry>("JournalEntry", journalEntrySchema);
export default JournalEntry;
