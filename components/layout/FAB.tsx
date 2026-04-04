"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, IndianRupee, RotateCcw, Timer, PenSquare, Target, Droplet, Activity } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import type { SheetType } from "@/store/uiStore";

const ROUTE_MAP: Record<string, { sheet: SheetType; Icon: typeof Plus }> = {
  "/money": { sheet: "money", Icon: IndianRupee },
  "/habits": { sheet: "habit", Icon: RotateCcw },
  "/activity": { sheet: "activity", Icon: Timer },
  "/journal": { sheet: "journal", Icon: PenSquare },
  "/goals": { sheet: "goal", Icon: Target },
  "/health": { sheet: "health", Icon: Droplet },
  "/dashboard": { sheet: "money", Icon: Plus },
};

const HIDDEN_PATHS = ["/", "/login", "/signup", "/settings", "/analytics", "/money", "/habits", "tasks"];

export function FAB() {
  const pathname = usePathname();
  const openSheet = useUIStore(s => s.openSheet);

  if (HIDDEN_PATHS.includes(pathname)) return null;

  // Find matching route (prefix match)
  const match = Object.entries(ROUTE_MAP).find(([prefix]) => pathname.startsWith(prefix));
  const { sheet, Icon } = match ? match[1] : { sheet: "money" as SheetType, Icon: Plus };

  return (
    <AnimatePresence>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 400, damping: 25 } }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => openSheet(sheet)}
        className="fixed bottom-20 right-4 md:right-8 md:bottom-8 w-14 h-14 bg-[var(--accent)] rounded-full shadow-lg flex items-center justify-center z-40 text-white"
        aria-label="Add new entry"
      >
        <Icon size={24} />
      </motion.button>
    </AnimatePresence>
  );
}
