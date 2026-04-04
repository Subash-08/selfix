"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useSWRConfig } from "swr";
import { useUIStore } from "@/store/uiStore";
import { DynamicIcon, AVAILABLE_ICONS } from "@/components/ui/DynamicIcon";

export function EditTaskSheet({ isOpen, onClose, dateStr, instance }: { isOpen: boolean, onClose: () => void, dateStr: string, instance: any }) {
  const { mutate } = useSWRConfig();
  const { addToast } = useUIStore();
  const [formData, setFormData] = useState({
    name: "",
    icon: "dumbbell",
    mode: "target-min",
    targetMode: "time",
    hours: "",
    mins: "",
    priority: "medium",
  });

  useEffect(() => {
    if (isOpen && instance) {
      setFormData({
        name: instance.name || "",
        icon: instance.icon || "dumbbell",
        mode: instance.mode || "target-min",
        targetMode: (instance.targetDuration || 0) > 0 ? "time" : "boolean",
        hours: instance.targetDuration ? Math.floor(instance.targetDuration / 60).toString() : "",
        mins: instance.targetDuration ? (instance.targetDuration % 60).toString() : "",
        priority: instance.priority || "medium",
      });
    }
  }, [isOpen, instance]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !instance) return;

    setIsSubmitting(true);
    let duration = 0;
    if (formData.targetMode === "time") {
      duration = (parseInt(formData.hours) || 0) * 60 + (parseInt(formData.mins) || 0);
    }

    try {
      const res = await fetch(`/api/task-instances/${instance._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          icon: formData.icon,
          mode: formData.mode,
          priority: formData.priority,
          targetDuration: duration
        })
      });

      if (!res.ok) throw new Error("Update failed");

      await mutate(`/api/task-instances?date=${dateStr}`);
      onClose();
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/task-instances/${instance._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Delete failed");
      await mutate(`/api/task-instances?date=${dateStr}`);
      onClose();
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !instance) return null;

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
            <h2 className="text-xl font-extrabold flex items-center gap-2">Edit Task</h2>
            <button onClick={onClose} className="p-2 bg-[var(--bg-elevated)] rounded-full text-[var(--text-muted)]"><X size={20}/></button>
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
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
                {AVAILABLE_ICONS.map(i => (
                  <button key={i} type="button" onClick={() => setFormData({...formData, icon: i})} className={`p-2.5 rounded-lg border transition-all ${formData.icon === i ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)] relative'}`}>
                     <DynamicIcon name={i} size={24} />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setFormData({...formData, mode: 'target-min'})} className={`p-4 rounded-xl border-2 flex flex-col items-start gap-1 ${formData.mode === 'target-min' ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] bg-[var(--bg-elevated)]'}`}>
                <span className="font-extrabold text-sm">Do At Least</span>
                <span className="text-[10px] text-[var(--text-muted)]">Build a habit</span>
              </button>
              <button type="button" onClick={() => setFormData({...formData, mode: 'target-max'})} className={`p-4 rounded-xl border-2 flex flex-col items-start gap-1 ${formData.mode === 'target-max' ? 'border-[var(--accent-red)] bg-[var(--accent-red)]/5' : 'border-[var(--border)] bg-[var(--bg-elevated)]'}`}>
                <span className="font-extrabold text-sm">Stay Under</span>
                <span className="text-[10px] text-[var(--text-muted)]">Set a limit</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase text-[var(--text-muted)] px-1">Goal Target</label>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <button type="button" onClick={() => setFormData({...formData, targetMode: 'time'})} className={`p-3 rounded-lg font-bold text-sm border ${formData.targetMode === 'time' ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}>Timer based</button>
                <button type="button" onClick={() => setFormData({...formData, targetMode: 'boolean'})} className={`p-3 rounded-lg font-bold text-sm border ${formData.targetMode === 'boolean' ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}>Just Checkbox</button>
              </div>

              {formData.targetMode === 'time' && (
                <div className="flex gap-4">
                  <div className="flex items-center gap-1 bg-[var(--bg-elevated)] px-4 py-2 rounded-xl flex-1 border border-[var(--border)] focus-within:border-[var(--accent)]">
                    <input type="number" min="0" placeholder="0" className="bg-transparent w-full font-bold text-xl outline-none" value={formData.hours} onChange={e=>setFormData({...formData, hours: e.target.value})} />
                    <span className="text-[var(--text-muted)] font-bold">h</span>
                  </div>
                  <div className="flex items-center gap-1 bg-[var(--bg-elevated)] px-4 py-2 rounded-xl flex-1 border border-[var(--border)] focus-within:border-[var(--accent)]">
                    <input type="number" min="0" max="59" placeholder="00" className="bg-transparent w-full font-bold text-xl outline-none" value={formData.mins} onChange={e=>setFormData({...formData, mins: e.target.value})} />
                    <span className="text-[var(--text-muted)] font-bold">m</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase text-[var(--text-muted)] px-1">Priority</label>
               <div className="flex gap-2">
                 {(['low', 'medium', 'high'] as const).map(p => (
                    <button key={p} type="button" onClick={() => setFormData({...formData, priority: p})} className={`flex-1 p-3 rounded-xl capitalize font-bold text-sm border ${formData.priority === p ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-secondary)]'}`}>{p}</button>
                 ))}
               </div>
            </div>

            <div className="flex gap-3 mt-2 pb-6">
              <button type="button" disabled={isSubmitting} onClick={handleDelete} className="px-4 py-4 bg-[var(--accent-red)]/10 text-[var(--accent-red)] rounded-2xl flex-shrink-0 active:scale-95 transition-all">
                 <Trash2 size={24} />
              </button>
              <button disabled={isSubmitting} type="submit" className="flex-1 py-4 bg-[var(--text-primary)] text-[var(--bg-default)] font-black rounded-2xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all text-lg">
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
