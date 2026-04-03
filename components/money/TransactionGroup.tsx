"use client";

import { Sunrise, Sun, Sunset, Moon } from "lucide-react";
import { EntryCard } from "./EntryCard";

interface TransactionEntry {
  _id: string;
  amount: number;
  type: "expense" | "income";
  paymentMode: string;
  category: string;
  note?: string;
  date: string;
}

interface TransactionGroupProps {
  label: string;
  entries: TransactionEntry[];
  onDelete: (id: string) => void;
  onEdit: (entry: TransactionEntry) => void;
}

const groupIcons: Record<string, typeof Sunrise> = {
  Morning: Sunrise,
  Afternoon: Sun,
  Evening: Sunset,
  Night: Moon,
};

export function getTimeGroup(dateStr: string): string {
  const hour = new Date(dateStr).getHours();
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Night";
}

export function groupEntriesByTime(entries: TransactionEntry[]): Record<string, TransactionEntry[]> {
  const groups: Record<string, TransactionEntry[]> = {};
  for (const entry of entries) {
    const group = getTimeGroup(entry.date);
    if (!groups[group]) groups[group] = [];
    groups[group].push(entry);
  }
  return groups;
}

export function TransactionGroup({ label, entries, onDelete, onEdit }: TransactionGroupProps) {
  const Icon = groupIcons[label] || Sun;
  const groupTotal = entries.reduce((sum, e) => {
    return e.type === "expense" ? sum - e.amount : sum + e.amount;
  }, 0);

  return (
    <div className="flex flex-col gap-2">
      {/* Group Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-[var(--text-muted)]" />
          <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            {label}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">
            ({entries.length})
          </span>
        </div>
        <span
          className="amount text-xs font-bold"
          style={{ color: groupTotal >= 0 ? "var(--money-income)" : "var(--money-expense)" }}
        >
          {groupTotal >= 0 ? "+" : ""}₹{Math.abs(groupTotal).toFixed(2)}
        </span>
      </div>

      {/* Entry Cards */}
      <div className="flex flex-col gap-1.5">
        {entries.map((entry) => (
          <EntryCard
            key={entry._id}
            entry={entry}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}
