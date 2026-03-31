"use client";

import React, { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  height?: string;
}

export function BottomSheet({ isOpen, onClose, children, height = "auto" }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[90]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose();
            }}
            style={{ height }}
            className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-[var(--bg-card)] rounded-t-[var(--radius)] z-[100] flex flex-col shadow-[var(--shadow)] pb-[env(safe-area-inset-bottom)]"
          >
            <div 
              className="w-full flex justify-center p-3 shrink-0 touch-none cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
            </div>
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
