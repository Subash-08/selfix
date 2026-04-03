"use client";

import { Zap, Settings } from "lucide-react";
import { CategoryIcon } from "./CategoryIcon";
import { MONEY_CATEGORIES } from "@/lib/constants";
import { useUIStore } from "@/store/uiStore";

interface RecurringTemplate {
  _id: string;
  name: string;
  amount: number;
  category: string;
  paymentMode: string;
}

interface QuickAddStripProps {
  templates: RecurringTemplate[];
  selectedDate: string;
  onQuickAdd: (template: RecurringTemplate) => void;
}

export function QuickAddStrip({ templates, selectedDate, onQuickAdd }: QuickAddStripProps) {
  if (templates.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <Zap size={14} className="text-[var(--accent-amber)]" />
        <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
          Quick Add
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-1 px-1">
        {templates.map((t) => {
          const cat = MONEY_CATEGORIES.find((c) => c.id === t.category.toLowerCase());
          return (
            <button
              key={t._id}
              type="button"
              onClick={() => onQuickAdd(t)}
              className="snap-start flex-shrink-0 flex items-center gap-2 px-3 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl transition-all active:scale-95 hover:border-[var(--accent)]"
            >
              <CategoryIcon
                name={cat?.icon || "Package"}
                size={14}
                color={cat?.color || "#6b7280"}
              />
              <span className="text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap">
                {t.name}
              </span>
              <span className="amount text-xs font-bold text-[var(--text-muted)]">
                ₹{t.amount.toFixed(2)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
