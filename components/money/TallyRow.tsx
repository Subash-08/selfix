"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, CheckCircle2, Pencil, HandCoins } from "lucide-react";
import { NumpadSheet } from "./NumpadSheet";
import { CategoryIcon } from "./CategoryIcon";

interface TallyRowProps {
  expectedCash: number | null;
  expectedUPI: number | null;
  actualCash: number | null;
  actualUPI: number | null;
  onSaveActualCash: (value: number) => void;
  onSaveActualUPI: (value: number) => void;
  isToday: boolean;
  openingSet: boolean;
}

function getMismatchDisplay(actual: number | null, expected: number | null) {
  if (actual === null || expected === null) {
    return { text: "Not entered", color: "var(--text-muted)", icon: HandCoins };
  }
  const diff = actual - expected;
  if (diff > 0) return { text: `₹${diff.toFixed(2)} surplus`, color: "var(--money-surplus)", icon: TrendingUp };
  if (diff < 0) return { text: `₹${Math.abs(diff).toFixed(2)} deficit`, color: "var(--money-deficit)", icon: TrendingDown };
  return { text: "Balanced", color: "var(--money-balanced)", icon: CheckCircle2 };
}

interface TallyCardProps {
  label: string;
  icon: string;
  color: string;
  expected: number | null;
  actual: number | null;
  onSave: (value: number) => void;
}

function TallyCard({ label, icon, color, expected, actual, onSave }: TallyCardProps) {
  const [numpadOpen, setNumpadOpen] = useState(false);
  const mismatch = getMismatchDisplay(actual, expected);
  const MismatchIcon = mismatch.icon;

  return (
    <>
      <div className="flex-1 bg-[var(--bg-elevated)] rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <CategoryIcon name={icon} size={12} color={color} />
            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              {label}
            </span>
          </div>
        </div>

        {/* Actual value */}
        <button
          type="button"
          onClick={() => setNumpadOpen(true)}
          className="w-full text-left mb-2 transition-all active:scale-[0.97]"
        >
          <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider block mb-0.5">
            Actual
          </span>
          {actual !== null ? (
            <div className="flex items-center gap-1">
              <span className="amount text-base font-bold text-[var(--text-primary)]">
                ₹{actual.toFixed(2)}
              </span>
              <Pencil size={10} className="text-[var(--text-muted)]" />
            </div>
          ) : (
            <span className="text-sm font-semibold text-[var(--accent)]">+ Enter</span>
          )}
        </button>

        {/* Mismatch */}
        <div className="flex items-center gap-1">
          <MismatchIcon size={11} style={{ color: mismatch.color }} />
          <span className="text-[10px] font-bold" style={{ color: mismatch.color }}>
            {mismatch.text}
          </span>
        </div>
      </div>

      <NumpadSheet
        isOpen={numpadOpen}
        onClose={() => setNumpadOpen(false)}
        onSubmit={onSave}
        label={`Actual ${label}`}
        initialValue={actual ?? undefined}
      />
    </>
  );
}

export function TallyRow({ expectedCash, expectedUPI, actualCash, actualUPI, onSaveActualCash, onSaveActualUPI, isToday, openingSet }: TallyRowProps) {
  if (!openingSet) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 opacity-60">
        <div className="flex items-center gap-2">
          <HandCoins size={16} className="text-[var(--text-muted)]" />
          <span className="text-sm text-[var(--text-muted)]">Set opening balance to enable tally</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <HandCoins size={14} className="text-[var(--accent)]" />
        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
          Tally — Enter actual to reconcile
        </span>
      </div>

      <div className="flex gap-3">
        <TallyCard
          label="Cash"
          icon="Banknote"
          color="#22c55e"
          expected={expectedCash}
          actual={actualCash}
          onSave={onSaveActualCash}
        />
        <TallyCard
          label="UPI"
          icon="Smartphone"
          color="#6c63ff"
          expected={expectedUPI}
          actual={actualUPI}
          onSave={onSaveActualUPI}
        />
      </div>
    </div>
  );
}
