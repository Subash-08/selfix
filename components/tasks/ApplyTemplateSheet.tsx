"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Search, Calendar, Copy, ChevronRight, Trash2 } from "lucide-react";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { useUIStore } from "@/store/uiStore";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function ApplyTemplateSheet({ isOpen, onClose, targetDate }: { isOpen: boolean, onClose: () => void, targetDate: string }) {
  const { data } = useSWR("/api/templates", fetcher);
  const templates = data?.data || [];
  const { mutate } = useSWRConfig();
  const { addToast } = useUIStore();

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [mode, setMode] = useState<"replace" | "merge">("merge");
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "duplicate" | "replace">("skip");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApply = async () => {
    if (!selectedTemplate) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tasks/apply-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate,
          date: targetDate,
          mode,
          mergeDuplicateStrategy: duplicateStrategy
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      addToast({ message: "Template applied!", type: "success" });
      mutate(key => typeof key === "string" && key.startsWith('/api/task-instances'));
      onClose();
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity">
        <motion.div
           initial={{ y: "100%" }}
           animate={{ y: 0 }}
           exit={{ y: "100%" }}
           className="bg-[var(--bg-card)] w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 border-t border-[var(--border)] flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-extrabold">Apply Template</h2>
            <button onClick={onClose} className="p-2 bg-[var(--bg-elevated)] rounded-full text-[var(--text-muted)]"><X size={20}/></button>
          </div>

          <div className="flex flex-col gap-2">
             <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Select Template</label>
             {templates.length === 0 ? (
               <div className="p-4 bg-[var(--bg-elevated)] rounded-xl text-sm font-medium text-[var(--text-muted)] text-center">No templates created yet. Save a template from your Today view!</div>
             ) : (
               <div className="flex flex-col gap-2">
                 {templates.map((t: any) => (
                     <div key={t._id} className="flex gap-2 items-center w-full">
                       <button 
                         onClick={() => setSelectedTemplate(t._id)}
                         className={`flex-1 p-4 rounded-xl border flex items-center justify-between text-left transition-all ${selectedTemplate === t._id ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] bg-[var(--bg-elevated)]'}`}
                       >
                         <div>
                           <span className={`block font-extrabold ${selectedTemplate === t._id ? 'text-[var(--accent)]' : ''}`}>{t.name}</span>
                           <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-card)] border border-[var(--border)] px-1.5 py-0.5 rounded-md">{t.tasks.length} tasks</span>
                              {t.usageCount > 0 && <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Used {t.usageCount}x</span>}
                              {t.lastUsedAt && <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">• Last: {Math.floor((Date.now() - new Date(t.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24))}d ago</span>}
                           </div>
                         </div>
                         {selectedTemplate === t._id && <div className="w-5 h-5 flex-shrink-0 rounded-full bg-[var(--accent)] flex items-center justify-center text-white"><Check size={12} strokeWidth={4}/></div>}
                       </button>
                       <button 
                         onClick={async () => {
                           await fetch(`/api/templates/${t._id}`, { method: 'DELETE' });
                           mutate('/api/templates');
                         }}
                         className="p-4 bg-[var(--accent-red)]/10 text-[var(--accent-red)] rounded-xl flex items-center justify-center active:scale-95 transition-transform"
                       >
                         <Trash2 size={20} />
                       </button>
                     </div>
                 ))}
               </div>
             )}
          </div>

          {selectedTemplate && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Application Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setMode('merge')} className={`p-3 rounded-lg border font-bold text-sm ${mode === 'merge' ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>Merge Items</button>
                  <button onClick={() => setMode('replace')} className={`p-3 rounded-lg border font-bold text-sm ${mode === 'replace' ? 'border-[var(--accent-red)] text-[var(--accent-red)] bg-[var(--accent-red)]/10' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>Replace All</button>
                </div>
              </div>

              {mode === 'merge' && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">If Task Already Exists...</label>
                  <select 
                    value={duplicateStrategy} 
                    onChange={e => setDuplicateStrategy(e.target.value as any)}
                    className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] outline-none font-bold text-sm"
                  >
                    <option value="skip">Skip it (Keep existing)</option>
                    <option value="replace">Replace it (Reset progress)</option>
                    <option value="duplicate">Keep both (Append copy)</option>
                  </select>
                </div>
              )}

              <button disabled={isSubmitting} onClick={handleApply} className="w-full py-4 mt-2 rounded-xl bg-[var(--text-primary)] text-[var(--bg-default)] font-black text-lg">
                {isSubmitting ? "Applying..." : "Confirm & Apply"}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
