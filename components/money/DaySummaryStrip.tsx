"use client";

import { ArrowDownRight, ArrowUpRight, Activity, Banknote, Smartphone, CreditCard } from "lucide-react";

interface DaySummaryStripProps {
  totalSpent: number;
  totalIncome: number;
  net: number;
  cashSpent: number;
  upiSpent: number;
  cardSpent: number;
}

export function DaySummaryStrip({ totalSpent, totalIncome, net, cashSpent, upiSpent, cardSpent }: DaySummaryStripProps) {
  const cards = [
    { label: "Total Spent", value: totalSpent, icon: ArrowDownRight, color: "var(--money-expense)", prefix: "₹" },
    { label: "Income", value: totalIncome, icon: ArrowUpRight, color: "var(--money-income)", prefix: "+₹" },
    { label: "Net", value: net, icon: Activity, color: net >= 0 ? "var(--money-income)" : "var(--money-expense)", prefix: net >= 0 ? "+₹" : "-₹" },
    { label: "Cash", value: cashSpent, icon: Banknote, color: "var(--text-secondary)", prefix: "₹" },
    { label: "UPI", value: upiSpent, icon: Smartphone, color: "var(--text-secondary)", prefix: "₹" },
    { label: "Card", value: cardSpent, icon: CreditCard, color: "var(--text-secondary)", prefix: "₹" },
  ];

  return (
    <div className="flex gap-2.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-1 px-1">
      {cards.map((card) => {
        const Icon = card.icon;
        const displayValue = card.label === "Net" ? Math.abs(card.value) : card.value;
        return (
          <div
            key={card.label}
            className="snap-start min-w-[130px] flex-shrink-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 flex flex-col gap-1.5"
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${card.color}15` }}
              >
                <Icon size={13} style={{ color: card.color }} />
              </div>
              <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {card.label}
              </span>
            </div>
            <span className="amount text-base font-bold" style={{ color: card.color }}>
              {card.prefix}{displayValue.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
