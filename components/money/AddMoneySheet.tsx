"use client";

import { useState, useEffect } from "react";
import { useSWRConfig } from "swr";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useUIStore } from "@/store/uiStore";
import { MONEY_CATEGORIES, PAYMENT_MODES } from "@/lib/constants";
import { CategoryIcon } from "./CategoryIcon";
import { Delete, Check, Trash2, CalendarDays, StickyNote } from "lucide-react";

interface EditEntry {
  _id: string;
  amount: number;
  type: "expense" | "income";
  paymentMode: string;
  category: string;
  note?: string;
  date: string;
}

interface Props {
  selectedDate: string;
  editEntry?: EditEntry | null;
  onClearEdit?: () => void;
}

const SMART_DEFAULTS_KEY = "selfix_money_defaults";

function getSmartDefaults(): { category: string; paymentMode: string } {
  if (typeof window === "undefined") return { category: "food", paymentMode: "cash" };
  try {
    const stored = localStorage.getItem(SMART_DEFAULTS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { category: "food", paymentMode: "cash" };
}

function setSmartDefaults(category: string, paymentMode: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SMART_DEFAULTS_KEY, JSON.stringify({ category, paymentMode }));
  } catch {}
}

export function AddMoneySheet({ selectedDate, editEntry, onClearEdit }: Props) {
  const { activeSheet, closeSheet, addToast } = useUIStore();
  const { mutate } = useSWRConfig();

  const isOpen = activeSheet === "money" || activeSheet === "money-edit";
  const isEditMode = !!editEntry && activeSheet === "money-edit";

  const defaults = getSmartDefaults();

  const [display, setDisplay] = useState("0");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [paymentMode, setPaymentMode] = useState(defaults.paymentMode);
  const [category, setCategory] = useState(defaults.category);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showNote, setShowNote] = useState(false);

  // Pre-fill edit mode
  useEffect(() => {
    if (isEditMode && editEntry) {
      setDisplay(editEntry.amount.toFixed(2));
      setType(editEntry.type);
      setPaymentMode(editEntry.paymentMode);
      setCategory(editEntry.category);
      setNote(editEntry.note || "");
      setShowNote(!!editEntry.note);
    } else if (isOpen && !isEditMode) {
      const d = getSmartDefaults();
      setDisplay("0");
      setType("expense");
      setPaymentMode(d.paymentMode);
      setCategory(d.category);
      setNote("");
      setShowNote(false);
    }
  }, [isOpen, isEditMode, editEntry]);

  const handleKey = (key: string) => {
    if (key === "backspace") {
      if (display.length <= 1 || display === "0") {
        setDisplay("0");
        return;
      }
      setDisplay(display.slice(0, -1) || "0");
      return;
    }
    if (key === ".") {
      if (display.includes(".")) return;
      setDisplay(display + ".");
      return;
    }
    if (display === "0" && key !== ".") {
      setDisplay(key);
      return;
    }
    const parts = display.split(".");
    if (parts[1] && parts[1].length >= 2) return;
    if (!display.includes(".") && parts[0].length >= 10) return;
    setDisplay(display + key);
  };

  const numericValue = parseFloat(display) || 0;

  const handleSubmit = async () => {
    if (numericValue <= 0) {
      return addToast({ message: "Enter a valid amount", type: "error" });
    }

    setIsLoading(true);
    try {
      if (isEditMode && editEntry) {
        const res = await fetch(`/api/money/${editEntry._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: numericValue,
            type,
            paymentMode,
            category,
            note: note.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error);
        addToast({ message: "Transaction updated!", type: "success" });
      } else {
        const res = await fetch("/api/money", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: numericValue,
            type,
            paymentMode,
            category,
            note: note.trim() || undefined,
            date: selectedDate,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error);
        addToast({ message: `${type === "income" ? "Income" : "Expense"} added!`, type: "success" });
      }

      setSmartDefaults(category, paymentMode);
      closeSheet();
      onClearEdit?.();
      mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/money"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      addToast({ message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editEntry) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/money/${editEntry._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      addToast({ message: "Entry deleted", type: "success" });
      closeSheet();
      onClearEdit?.();
      mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/money"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      addToast({ message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    closeSheet();
    onClearEdit?.();
  };

  const numpadKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"];

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      <div className="flex flex-col gap-4 max-h-[92vh] overflow-y-auto pb-4">
        {/* Amount Display */}
        <div className="text-center py-2">
          <span
            className={`amount text-4xl font-bold transition-colors duration-200 ${
              numericValue > 0 ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
            }`}
          >
            ₹{display}
          </span>
        </div>

        {/* Type Toggle */}
        <div className="flex bg-[var(--bg-elevated)] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              type === "expense"
                ? "bg-[var(--money-expense)] text-white shadow-sm"
                : "text-[var(--text-secondary)]"
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              type === "income"
                ? "bg-[var(--money-income)] text-white shadow-sm"
                : "text-[var(--text-secondary)]"
            }`}
          >
            Income
          </button>
        </div>

        {/* Numpad Grid */}
        <div className="grid grid-cols-3 gap-1.5">
          {numpadKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleKey(key)}
              className="flex items-center justify-center h-14 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] text-lg font-semibold transition-all active:scale-95 active:bg-[var(--border)]"
            >
              {key === "backspace" ? (
                <Delete size={20} className="text-[var(--text-secondary)]" />
              ) : (
                key
              )}
            </button>
          ))}
        </div>

        {/* Payment Mode */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {PAYMENT_MODES.map((pm) => (
            <button
              key={pm.id}
              type="button"
              onClick={() => setPaymentMode(pm.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                paymentMode === pm.id
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"
              }`}
            >
              <CategoryIcon name={pm.icon} size={14} />
              {pm.label}
            </button>
          ))}
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5 max-h-[200px] overflow-y-auto">
          {MONEY_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[10px] font-bold transition-all ${
                category === cat.id
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"
              }`}
            >
              <CategoryIcon
                name={cat.icon}
                size={16}
                color={category === cat.id ? "#fff" : cat.color}
              />
              <span className="truncate w-full text-center px-0.5">
                {cat.label.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>

        {/* Note + Date Row */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowNote(!showNote)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              showNote || note
                ? "bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30"
                : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"
            }`}
          >
            <StickyNote size={14} />
            Note
          </button>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)]">
            <CalendarDays size={14} />
            {selectedDate}
          </div>
        </div>

        {showNote && (
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note..."
            maxLength={200}
            className="h-11 px-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] focus:outline-none focus:border-[var(--accent)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-base transition-colors"
          />
        )}

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || numericValue <= 0}
          className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-[var(--accent)] text-white font-bold text-base transition-all active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Check size={20} />
              {isEditMode ? "Save Changes" : type === "income" ? "Add Income" : "Add Expense"}
            </>
          )}
        </button>

        {/* Delete Button (edit mode) */}
        {isEditMode && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 h-12 rounded-xl bg-[var(--money-expense)]/10 text-[var(--money-expense)] font-bold text-sm transition-all active:scale-[0.97] disabled:opacity-40"
          >
            <Trash2 size={16} />
            Delete Entry
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
