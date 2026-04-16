"use client";

import { Trash2, Clock } from "lucide-react";
import { format } from "date-fns";
import { CategoryIcon } from "./CategoryIcon";
import { MONEY_CATEGORIES, PAYMENT_MODES } from "@/lib/constants";

interface EntryCardProps {
  entry: {
    _id: string;
    amount: number;
    type: "expense" | "income";
    paymentMode: string;
    category: string;
    note?: string;
    date: string;
  };
  onDelete: (id: string) => void;
  onEdit: (entry: EntryCardProps["entry"]) => void;
}

export function EntryCard({ entry, onDelete, onEdit }: EntryCardProps) {
  const categoryMeta = MONEY_CATEGORIES.find(
    (c) => c.id === entry.category.toLowerCase() || c.label.toLowerCase() === entry.category.toLowerCase()
  );
  const paymentMeta = PAYMENT_MODES.find((p) => p.id === entry.paymentMode);

  const handleClick = () => {
    onEdit(entry);
  };

  const entryTime = format(new Date(entry.date), "h:mm a");
  const isIncome = entry.type === "income";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      className="flex items-center gap-3 p-3.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl transition-transform active:scale-[0.98] cursor-pointer group"
    >
      {/* Category Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${categoryMeta?.color || "#6b7280"}20` }}
      >
        <CategoryIcon
          name={categoryMeta?.icon || "Package"}
          size={18}
          color={categoryMeta?.color || "#6b7280"}
        />
      </div>

      {/* Middle: Name + Note + Payment Mode */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[var(--text-primary)] truncate">
          {categoryMeta?.label || entry.category}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {entry.note && (
            <span className="text-[11px] text-[var(--text-muted)] truncate max-w-[120px]">
              {entry.note}
            </span>
          )}
          {entry.note && paymentMeta && (
            <span className="text-[var(--text-muted)] text-[10px]">·</span>
          )}
          {paymentMeta && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[var(--bg-elevated)] text-[var(--text-muted)] uppercase tracking-wider">
              <CategoryIcon name={paymentMeta.icon} size={8} />
              {paymentMeta.label}
            </span>
          )}
        </div>
      </div>

      {/* Right: Amount + Time */}
      <div className="flex flex-col items-end flex-shrink-0">
        <span
          className="amount text-sm font-bold"
          style={{ color: isIncome ? "var(--money-income)" : "var(--money-expense)" }}
        >
          {isIncome ? "+" : "-"}₹{entry.amount.toFixed(2)}
        </span>
        <div className="flex items-center gap-0.5 mt-0.5">
          <Clock size={9} className="text-[var(--text-muted)]" />
          <span className="text-[10px] text-[var(--text-muted)]">{entryTime}</span>
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(entry._id); }}
        className="flex md:opacity-0 md:group-hover:opacity-100 w-8 h-8 rounded-lg items-center justify-center text-[var(--accent-red)] active:bg-[var(--accent-red)]/10 md:hover:bg-[var(--accent-red)]/10 transition-all flex-shrink-0"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
