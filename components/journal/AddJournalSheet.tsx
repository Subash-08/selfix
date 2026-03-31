"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useUIStore } from "@/store/uiStore";
import { Wand2, Image as ImageIcon } from "lucide-react";

export function AddJournalSheet() {
  const { isAddJournalOpen, setAddJournalOpen, addToast } = useUIStore();
  const { mutate } = useSWRConfig();
  
  const [rawNotes, setRawNotes] = useState("");
  const [wentWell, setWentWell] = useState("");
  const [drained, setDrained] = useState("");
  const [tomorrow, setTomorrow] = useState("");
  const [mood, setMood] = useState<number>(3);
  
  const [isExpanding, setIsExpanding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedContent, setExpandedContent] = useState("");

  const handleAIExpand = async () => {
    if (!rawNotes && !wentWell && !tomorrow) {
      return addToast({ message: "Write some notes to expand!", type: "info" });
    }
    
    setIsExpanding(true);
    try {
      const res = await fetch("/api/journal/ai-expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawNotes, wentWell, drained, tomorrow, mood })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setExpandedContent(data.text);
      addToast({ message: "AI Expansion Complete (Gemini Flash)", type: "success" });
    } catch (e: any) {
      addToast({ message: e.message || "Ensure GEMINI_API_KEY is in .env.local!", type: "error" });
    } finally {
      setIsExpanding(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const moodEmojis = ["😫", "😔", "😐", "🙂", "🤩"];
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
           rawNotes, 
           expandedContent, 
           mood, 
           moodEmoji: moodEmojis[mood - 1] 
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setAddJournalOpen(false);
      
      // reset form
      setRawNotes(""); setWentWell(""); setDrained(""); setTomorrow(""); setExpandedContent(""); setMood(3);
      
      mutate('/api/journal');
      addToast({ message: "Journal entry saved", type: "success" });
    } catch (e: any) {
      addToast({ message: e.message || "Save failed", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet isOpen={isAddJournalOpen} onClose={() => setAddJournalOpen(false)}>
      <div className="flex flex-col gap-6 max-h-[85vh] overflow-y-auto pb-6">
        <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Daily Reflection</h2>
        
        {/* Mood Selector Module */}
        <div className="flex justify-between items-center bg-[var(--bg-elevated)] p-2 rounded-2xl border border-[var(--border)] shadow-inner">
          {["😫", "😔", "😐", "🙂", "🤩"].map((emoji, idx) => (
             <button
               key={idx}
               type="button"
               onClick={() => setMood(idx + 1)}
               className={`text-3xl transition-all p-2 rounded-xl ${mood === idx + 1 ? 'bg-[var(--accent)] text-white shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)] scale-110 grayscale-0' : 'grayscale opacity-40 hover:opacity-100 hover:scale-105'}`}
             >
               {emoji}
             </button>
          ))}
        </div>

        {/* Dynamic Display Switcher */}
        {expandedContent ? (
          <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex justify-between items-center">
               <span className="text-xs font-bold uppercase text-[var(--accent-purple)] flex items-center gap-1.5 tracking-widest"><Wand2 size={13}/> AI Draft</span>
               <button onClick={() => setExpandedContent("")} className="text-xs font-bold text-[var(--text-muted)] hover:text-white underline tracking-wider transition-colors">Edit Raw Form</button>
             </div>
             <div className="p-5 bg-[var(--bg-elevated)] rounded-2xl text-[var(--text-secondary)] text-sm leading-relaxed border border-[var(--accent-purple)]/40 backdrop-blur-md shadow-[0_0_30px_rgba(168,85,247,0.05)] whitespace-pre-wrap glow">
               {expandedContent}
             </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 animate-in fade-in duration-300">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Brain Dump</label>
              <textarea 
                value={rawNotes} 
                onChange={(e) => setRawNotes(e.target.value)}
                placeholder="Spill your thoughts..."
                className="w-full bg-[var(--bg-card)] min-h-[120px] text-[var(--text-primary)] px-4 py-4 rounded-xl border border-[var(--border)] focus:border-[var(--accent)] resize-none shadow-sm transition-colors focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            <Input label="Highlights? (What went right)" value={wentWell} onChange={(e) => setWentWell(e.target.value)} />
            <Input label="Frictions? (What drained.you)" value={drained} onChange={(e) => setDrained(e.target.value)} />
            <Input label="Tomorrow's Vision?" value={tomorrow} onChange={(e) => setTomorrow(e.target.value)} />
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex gap-3 mt-4">
          {!expandedContent && (
            <Button
              type="button"
              variant="outline"
              onClick={handleAIExpand}
              isLoading={isExpanding}
              className="flex-1 border-[var(--accent-purple)] border-2 text-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/10 font-bold transition-all"
            >
              {!isExpanding && <Wand2 size={18} className="mr-2" />}
              AI Expand
            </Button>
          )}
          
          <Button
            type="button"
            onClick={handleSave}
            isLoading={isSaving}
            className={`flex-1 font-bold tracking-wide ${expandedContent ? 'w-full shadow-lg hover:scale-[1.02] transition-transform' : ''}`}
          >
            Save Entry
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
