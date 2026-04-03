"use client";

import { Lock } from "lucide-react";
import { CategoryIcon } from "./CategoryIcon";

interface ClosingBalanceCardProps {
  label: string;
  icon: string;
  amount: number | null;
  openingSet: boolean;
  color: string;
}

export function ClosingBalanceCard({ label, icon, amount, openingSet, color }: ClosingBalanceCardProps) {
  return (
    <div
      className={`flex-1 rounded-2xl p-4 border ${
        openingSet ? "bg-[var(--bg-card)] border-[var(--border)]" : "bg-[var(--bg-elevated)] border-[var(--border)] opacity-60"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: openingSet ? `${color}20` : "var(--bg-elevated)" }}
        >
          {openingSet ? (
            <CategoryIcon name={icon} size={14} color={color} />
          ) : (
            <Lock size={14} className="text-[var(--text-muted)]" />
          )}
        </div>
        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
          {label}
        </span>
      </div>

      {openingSet && amount !== null ? (
        <p
          className="amount text-xl font-bold"
          style={{ color: amount >= 0 ? "var(--money-income)" : "var(--money-expense)" }}
        >
          ₹{amount.toFixed(2)}
        </p>
      ) : (
        <div className="flex flex-col">
          <p className="text-lg font-bold text-[var(--text-muted)]">—</p>
          <p className="text-[10px] text-[var(--text-muted)]">
            {openingSet ? "No data" : "Set opening balance first"}
          </p>
        </div>
      )}
    </div>
  );
}
