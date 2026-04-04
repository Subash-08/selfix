"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { DynamicIcon, AVAILABLE_ICONS } from "@/components/ui/DynamicIcon";

export function AddTaskSheet({ isOpen, onClose, dateStr }: { isOpen: boolean, onClose: () => void, dateStr: string }) {
  const { mutate } = useSWRConfig();
  const [formData, setFormData] = useState({
    name: "",
    icon: "dumbbell",
    mode: "target-min",
    targetMode: "time", // 'boolean' | 'time'
    hours: "",
    mins: "",
    priority: "medium",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    let duration = 0;
    if (formData.targetMode === "time") {
      duration = (parseInt(formData.hours) || 0) * 60 + (parseInt(formData.mins) || 0);
    }

    try {
      await fetch('/api/task-instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr, // Requires passing dateStr as a prop to AddTaskSheet
          name: formData.name,
          icon: formData.icon,
          mode: formData.mode,
          priority: formData.priority,
          targetDuration: duration,
          category: 'custom'
        })
      });
      mutate(key => typeof key === "string" && key.startsWith('/api/task-instances'));
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pb-0 sm:pb-4 transition-opacity">
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-[var(--bg-card)] w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-6 border-t border-[var(--border)] shadow-[var(--shadow-xl)] flex flex-col gap-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold">New Task</h2>
            <button onClick={onClose} className="p-2 bg-[var(--bg-elevated)] rounded-full text-[var(--text-muted)]"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 overflow-y-auto max-h-[75vh] scrollbar-hide px-1">

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase text-[var(--text-muted)] px-1">Task Name</label>
              <div className="flex items-center gap-2">
                <button type="button" className="p-3 bg-[var(--bg-elevated)] text-[var(--accent)] rounded-xl border border-[var(--border)]">
                  <DynamicIcon name={formData.icon} size={28} />
                </button>
                <input
                  autoFocus
                  required
                  placeholder="e.g. Read 10 Pages..."
                  className="flex-1 bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] outline-none focus:border-[var(--accent)] text-lg font-bold transition-colors shadow-inner"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
                {AVAILABLE_ICONS.map(i => (
                  <button key={i} type="button" onClick={() => setFormData({ ...formData, icon: i })} className={`p-2.5 rounded-lg border transition-all ${formData.icon === i ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)] relative'}`}>
                    <DynamicIcon name={i} size={24} />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setFormData({ ...formData, mode: 'target-min' })} className={`p-4 rounded-xl border-2 flex flex-col items-start gap-1 ${formData.mode === 'target-min' ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] bg-[var(--bg-elevated)]'}`}>
                <span className="font-extrabold text-sm">Do At Least</span>
                <span className="text-[10px] text-[var(--text-muted)]">Build a habit</span>
              </button>
              <button type="button" onClick={() => setFormData({ ...formData, mode: 'target-max' })} className={`p-4 rounded-xl border-2 flex flex-col items-start gap-1 ${formData.mode === 'target-max' ? 'border-[var(--accent-red)] bg-[var(--accent-red)]/5' : 'border-[var(--border)] bg-[var(--bg-elevated)]'}`}>
                <span className="font-extrabold text-sm">Stay Under</span>
                <span className="text-[10px] text-[var(--text-muted)]">Set a limit</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase text-[var(--text-muted)] px-1">Goal Target</label>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <button type="button" onClick={() => setFormData({ ...formData, targetMode: 'time' })} className={`p-3 rounded-lg font-bold text-sm border ${formData.targetMode === 'time' ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}>Timer based</button>
                <button type="button" onClick={() => setFormData({ ...formData, targetMode: 'boolean' })} className={`p-3 rounded-lg font-bold text-sm border ${formData.targetMode === 'boolean' ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}>Just Checkbox</button>
              </div>

              {formData.targetMode === 'time' && (
                <div className="flex gap-4">
                  <div className="flex items-center gap-1 bg-[var(--bg-elevated)] px-4 py-2 rounded-xl flex-1 border border-[var(--border)] focus-within:border-[var(--accent)]">
                    <input type="number" min="0" placeholder="0" className="bg-transparent w-full font-bold text-xl outline-none" value={formData.hours} onChange={e => setFormData({ ...formData, hours: e.target.value })} />
                    <span className="text-[var(--text-muted)] font-bold">h</span>
                  </div>
                  <div className="flex items-center gap-1 bg-[var(--bg-elevated)] px-4 py-2 rounded-xl flex-1 border border-[var(--border)] focus-within:border-[var(--accent)]">
                    <input type="number" min="0" max="59" placeholder="00" className="bg-transparent w-full font-bold text-xl outline-none" value={formData.mins} onChange={e => setFormData({ ...formData, mins: e.target.value })} />
                    <span className="text-[var(--text-muted)] font-bold">m</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase text-[var(--text-muted)] px-1">Priority</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map(p => (
                  <button key={p} type="button" onClick={() => setFormData({ ...formData, priority: p })} className={`flex-1 p-3 rounded-xl capitalize font-bold text-sm border ${formData.priority === p ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-secondary)]'}`}>{p}</button>
                ))}
              </div>
            </div>

            <button disabled={isSubmitting} type="submit" className="w-full py-4 bg-[var(--text-primary)] text-[var(--accent)]  rounded-2xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all text-lg mt-2">
              {isSubmitting ? "Saving..." : "Create Task"}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
