"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { useUIStore } from "@/store/uiStore";

export function SaveTemplateModal({ isOpen, onClose, dateStr }: { isOpen: boolean, onClose: () => void, dateStr: string }) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflict, setConflict] = useState(false);
  const { addToast } = useUIStore();

  const handleSave = async (e?: React.FormEvent, overwrite: boolean = false) => {
    if (e) e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/templates/from-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr, name, overwrite })
      });
      const data = await res.json();
      
      if (res.status === 409 && data.conflict) {
         setConflict(true);
         return;
      }

      if (!res.ok) throw new Error(data.error);
      
      addToast({ message: overwrite ? "Template Overwritten!" : "Template saved!", type: "success" });
      onClose();
      setConflict(false);
    } catch (err: any) {
      addToast({ message: err.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
         <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[var(--bg-card)] rounded-2xl w-full max-w-sm p-6 shadow-xl border border-[var(--border)]"
         >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-lg">Save Template</h3>
              <button onClick={() => { onClose(); setConflict(false); }}><X size={20} className="text-[var(--text-muted)]" /></button>
            </div>
            
            {conflict ? (
               <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                 <div className="p-4 bg-[var(--accent-amber)]/10 text-[var(--accent-amber)] rounded-xl border border-[var(--accent-amber)]/20 text-center">
                   <p className="font-extrabold text-lg mb-1">Template Exists!</p>
                   <p className="text-sm font-medium">Do you want to overwrite your existing '{name}' template?</p>
                 </div>
                 <div className="grid grid-cols-2 gap-2 mt-2">
                    <button disabled={isSubmitting} onClick={() => setConflict(false)} className="py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] font-bold text-sm">Cancel</button>
                    <button disabled={isSubmitting} onClick={() => handleSave(undefined, true)} className="py-3 rounded-xl bg-[var(--accent)] text-white font-bold text-sm shadow-md">Overwrite</button>
                 </div>
               </div>
            ) : (
              <form onSubmit={(e) => handleSave(e, false)} className="flex flex-col gap-4">
                 <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-2">Template Name</label>
                    <input
                      autoFocus
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Weekend Routine"
                      className="w-full bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)] focus:border-[var(--accent)] outline-none font-bold"
                    />
                 </div>
                 <button disabled={isSubmitting} type="submit" className="w-full mt-2 py-4 rounded-xl bg-[var(--text-primary)] text-[var(--bg-default)] font-black">
                   {isSubmitting ? "Saving..." : "Save Template"}
                 </button>
              </form>
            )}
         </motion.div>
      </div>
    </AnimatePresence>
  );
}
