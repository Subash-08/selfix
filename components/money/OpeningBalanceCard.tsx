"use client";

import { useState } from "react";
import { Plus, Pencil, ArrowRightLeft } from "lucide-react";
import { NumpadSheet } from "./NumpadSheet";
import { CategoryIcon } from "./CategoryIcon";

interface OpeningBalanceCardProps {
  label: string;
  icon: string;
  amount: number | null;
  onSave: (value: number) => void;
  color: string;
  isCarryForward?: boolean;
}

export function OpeningBalanceCard({ label, icon, amount, onSave, color, isCarryForward }: OpeningBalanceCardProps) {
  const [numpadOpen, setNumpadOpen] = useState(false);
  const isSet = amount !== null && amount !== undefined;

  return (
    <>
      <button
        type="button"
        onClick={() => setNumpadOpen(true)}
        className={`flex-1 rounded-2xl p-4 transition-all active:scale-[0.97] text-left relative ${
          isSet
            ? "bg-[var(--bg-card)] border border-[var(--border)]"
            : "bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-hover)]"
        }`}
      >
        {isSet ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${color}20` }}
              >
                <CategoryIcon name={icon} size={14} color={color} />
              </div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                {label}
              </span>
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); setNumpadOpen(true); }}
                className="ml-auto w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
              >
                <Pencil size={12} />
              </div>
            </div>
            <p className="amount text-xl font-bold text-[var(--text-primary)]">
              ₹{amount.toFixed(2)}
            </p>
            {isCarryForward && (
              <div className="flex items-center gap-1 mt-1.5">
                <ArrowRightLeft size={10} className="text-[var(--accent)]" />
                <span className="text-[9px] font-semibold text-[var(--accent)]">Carried forward</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-3 gap-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${color}15` }}
            >
              <Plus size={18} style={{ color }} />
            </div>
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              Set {label}
            </span>
          </div>
        )}
      </button>

      <NumpadSheet
        isOpen={numpadOpen}
        onClose={() => setNumpadOpen(false)}
        onSubmit={onSave}
        label={`Set ${label}`}
        initialValue={isSet ? amount : undefined}
      />
    </>
  );
}
