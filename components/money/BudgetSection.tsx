"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Target } from "lucide-react";
import { CategoryIcon } from "./CategoryIcon";
import { MONEY_CATEGORIES } from "@/lib/constants";

interface BudgetStatusItem {
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  overspent: boolean;
}

interface BudgetSectionProps {
  budgetStatus: BudgetStatusItem[];
}

export function BudgetSection({ budgetStatus }: BudgetSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (budgetStatus.length === 0) {
    return (
      <button
        type="button"
        onClick={() => {
          try {
            // Need to import useUIStore or handle via prop. 
            // Better to show an alert if not passing it.
            alert("Budget setup coming soon!");
          } catch(e) {}
        }}
        className="flex w-full items-center gap-2 p-4 bg-[var(--bg-card)] border border-dashed border-[var(--border-hover)] rounded-2xl text-sm font-semibold text-[var(--text-muted)] transition-all active:scale-[0.98]"
      >
        <Target size={16} className="text-[var(--accent)]" />
        Set monthly budgets →
      </button>
    );
  }

  const totalRemaining = budgetStatus.reduce((sum, b) => sum + b.remaining, 0);
  const trackingCount = budgetStatus.length;

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
      {/* Collapsed Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-2">
          <Target size={16} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            Budget
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            {trackingCount} tracking · ₹{totalRemaining.toFixed(2)} left
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-[var(--text-muted)]" />
        ) : (
          <ChevronDown size={16} className="text-[var(--text-muted)]" />
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-2.5 border-t border-[var(--border)] pt-3">
          {budgetStatus.map((b) => {
            const cat = MONEY_CATEGORIES.find(
              (c) => c.id === b.category.toLowerCase() || c.label.toLowerCase() === b.category.toLowerCase()
            );
            return (
              <div key={b.category} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CategoryIcon
                      name={cat?.icon || "Package"}
                      size={14}
                      color={cat?.color || "#6b7280"}
                    />
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {cat?.label || b.category}
                    </span>
                  </div>
                  <span
                    className="amount text-xs font-bold"
                    style={{ color: b.overspent ? "var(--money-expense)" : "var(--text-secondary)" }}
                  >
                    ₹{b.spent.toFixed(2)} / ₹{b.budget.toFixed(2)}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, b.percentUsed)}%`,
                      backgroundColor: b.overspent ? "var(--money-expense)" : "var(--money-income)",
                    }}
                  />
                </div>
                {b.overspent && (
                  <p className="text-[9px] font-bold text-[var(--money-expense)]">
                    Over budget by ₹{Math.abs(b.remaining).toFixed(2)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
