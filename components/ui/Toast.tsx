"use client";

import { useUIStore, Toast } from "@/store/uiStore";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-[100] w-full max-w-sm px-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onRemove, 2000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const borders: Record<Toast["type"], string> = {
    success: "border-l-4 border-l-[var(--accent-green)]",
    error: "border-l-4 border-l-[var(--accent-red)]",
    info: "border-l-4 border-l-[var(--accent-blue)]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`bg-[var(--bg-elevated)] text-[var(--text-primary)] px-4 py-3 rounded-md shadow-lg flex items-center gap-3 w-full pointer-events-auto ${borders[toast.type]}`}
    >
      <p className="text-sm font-medium">{toast.message}</p>
    </motion.div>
  );
}
