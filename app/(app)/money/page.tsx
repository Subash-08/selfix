"use client";

import { useState, useRef, useCallback } from "react";
import useSWR from "swr";
import { format, isSameDay, startOfDay } from "date-fns";
import { IndianRupee, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { DateNavigator } from "@/components/ui/DateNavigator";
import { MoneyTabSwitcher } from "@/components/money/MoneyTabSwitcher";
import { DaySummaryStrip } from "@/components/money/DaySummaryStrip";
import { OpeningBalanceCard } from "@/components/money/OpeningBalanceCard";
import { ClosingBalanceCard } from "@/components/money/ClosingBalanceCard";
import { TallyRow } from "@/components/money/TallyRow";
import { BudgetSection } from "@/components/money/BudgetSection";
import { TransactionGroup, groupEntriesByTime } from "@/components/money/TransactionGroup";
import { QuickAddStrip } from "@/components/money/QuickAddStrip";
import { AddMoneySheet } from "@/components/money/AddMoneySheet";
import { useUIStore } from "@/store/uiStore";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TransactionEntry {
  _id: string;
  amount: number;
  type: "expense" | "income";
  paymentMode: string;
  category: string;
  note?: string;
  date: string;
}

export default function MoneyPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data, error, isLoading, mutate } = useSWR(`/api/money?date=${dateStr}`, fetcher);
  const { addToast, openSheet } = useUIStore();

  const [filter, setFilter] = useState<"all" | "cash" | "upi" | "card" | "bank">("all");
  const [editEntry, setEditEntry] = useState<TransactionEntry | null>(null);

  // Undo delete state
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deletedBackup, setDeletedBackup] = useState<TransactionEntry | null>(null);

  const entries: TransactionEntry[] = data?.data?.entries || [];
  const computed = data?.data?.computed || {};
  const dayBalance = data?.data?.dayBalance;
  const budgetStatus = data?.data?.todaysBudgetStatus || [];
  const recurringTemplates = data?.data?.recurringTemplates || [];

  const isToday = isSameDay(selectedDate, startOfDay(new Date()));
  const openingCashSet = dayBalance?.openingCash !== undefined && dayBalance?.openingCash !== null;
  const openingUPISet = dayBalance?.openingUPI !== undefined && dayBalance?.openingUPI !== null;
  const anyOpeningSet = openingCashSet || openingUPISet;

  // Filter entries
  const filteredEntries = filter === "all"
    ? entries.filter((e) => e.type === "expense")
    : entries.filter((e) => e.type === "expense" && e.paymentMode === filter);

  const incomeEntries = entries.filter((e) => e.type === "income");
  const timeGroups = groupEntriesByTime(filteredEntries);
  const incomeGroups = groupEntriesByTime(incomeEntries);

  // ─── Balance handlers ────────────────────────────────────────
  const saveBalance = useCallback(async (field: string, value: number) => {
    try {
      await fetch("/api/money/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr, [field]: value }),
      });
      mutate();
    } catch {
      addToast({ message: "Failed to save balance", type: "error" });
    }
  }, [dateStr, mutate, addToast]);

  // ─── Delete with undo ────────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    const entry = entries.find((e) => e._id === id);
    if (!entry) return;

    // Delete immediately
    try {
      await fetch(`/api/money/${id}`, { method: "DELETE" });
      setDeletedBackup(entry);
      mutate();

      // Clear any existing undo timer
      if (undoTimer.current) clearTimeout(undoTimer.current);

      addToast({ message: "Entry deleted", type: "info" });

      // Clear backup after 5 seconds
      undoTimer.current = setTimeout(() => {
        setDeletedBackup(null);
        undoTimer.current = null;
      }, 5000);
    } catch {
      addToast({ message: "Failed to delete", type: "error" });
    }
  }, [entries, mutate, addToast]);

  const handleUndo = useCallback(async () => {
    if (!deletedBackup) return;
    if (undoTimer.current) {
      clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }

    try {
      await fetch("/api/money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: deletedBackup.amount,
          type: deletedBackup.type,
          paymentMode: deletedBackup.paymentMode,
          category: deletedBackup.category,
          note: deletedBackup.note,
          date: format(new Date(deletedBackup.date), "yyyy-MM-dd"),
        }),
      });
      setDeletedBackup(null);
      mutate();
      addToast({ message: "Entry restored!", type: "success" });
    } catch {
      addToast({ message: "Failed to restore", type: "error" });
    }
  }, [deletedBackup, mutate, addToast]);

  // ─── Edit handler ────────────────────────────────────────────
  const handleEdit = useCallback((entry: TransactionEntry) => {
    setEditEntry(entry);
    openSheet("money-edit");
  }, [openSheet]);

  // ─── Quick Add handler ───────────────────────────────────────
  const handleQuickAdd = useCallback(async (template: { name: string; amount: number; category: string; paymentMode: string }) => {
    try {
      await fetch("/api/money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: template.amount,
          type: "expense",
          paymentMode: template.paymentMode,
          category: template.category,
          note: template.name,
          date: dateStr,
        }),
      });
      mutate();
      addToast({ message: `Added ₹${template.amount.toFixed(2)} for ${template.name}`, type: "success" });
    } catch {
      addToast({ message: "Failed to add", type: "error" });
    }
  }, [dateStr, mutate, addToast]);

  const filterModes = ["all", "cash", "upi", "card", "bank"] as const;

  // ─── Loading State ───────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 w-full pb-24">
        <div className="h-10 border-b border-[var(--border)]" />
        <Skeleton height="52px" rounded="xl" />
        <div className="flex gap-2.5 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="130px" height="72px" rounded="xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton height="100px" rounded="2xl" />
          <Skeleton height="100px" rounded="2xl" />
        </div>
        <Skeleton height="80px" rounded="2xl" />
        <Skeleton height="80px" rounded="2xl" />
        <Skeleton height="80px" rounded="2xl" />
      </div>
    );
  }

  // ─── Error State ─────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col gap-4 pb-24">
        <MoneyTabSwitcher />
        <EmptyState title="Something went wrong" subtitle="Could not load money data. Please try again." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-24 animate-in fade-in duration-300">
      {/* 1. Tab Switcher */}
      <MoneyTabSwitcher />

      {/* 2. Date Navigator */}
      <DateNavigator selectedDate={selectedDate} onChange={setSelectedDate} />

      {/* 3. Day Summary Strip */}
      <DaySummaryStrip
        totalSpent={computed.totalExpenses || 0}
        totalIncome={computed.totalIncome || 0}
        net={computed.net || 0}
        cashSpent={computed.totalSpentCash || 0}
        upiSpent={computed.totalSpentUPI || 0}
        cardSpent={computed.totalSpentCard || 0}
      />

      {/* 4. Opening Balance */}
      <div>
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">
          Opening Balance
        </p>
        <div className="grid grid-cols-2 gap-3">
          <OpeningBalanceCard
            label="Cash"
            icon="Banknote"
            amount={dayBalance ? dayBalance.openingCash : null}
            onSave={(val) => saveBalance("openingCash", val)}
            color="#22c55e"
            isCarryForward={dayBalance?.carryForward}
          />
          <OpeningBalanceCard
            label="UPI"
            icon="Smartphone"
            amount={dayBalance ? dayBalance.openingUPI : null}
            onSave={(val) => saveBalance("openingUPI", val)}
            color="#6c63ff"
            isCarryForward={dayBalance?.carryForward}
          />
        </div>
      </div>

      {/* 5. Closing Balance (Expected) */}
      <div>
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">
          Expected Closing
        </p>
        <div className="grid grid-cols-2 gap-3">
          <ClosingBalanceCard
            label="Cash"
            icon="Banknote"
            amount={anyOpeningSet ? (computed.expectedCash ?? null) : null}
            openingSet={!!dayBalance}
            color="#22c55e"
          />
          <ClosingBalanceCard
            label="UPI"
            icon="Smartphone"
            amount={anyOpeningSet ? (computed.expectedUPI ?? null) : null}
            openingSet={!!dayBalance}
            color="#6c63ff"
          />
        </div>
      </div>

      {/* 6. Tally */}
      <TallyRow
        expectedCash={computed.expectedCash ?? null}
        expectedUPI={computed.expectedUPI ?? null}
        actualCash={dayBalance?.closingCashActual ?? null}
        actualUPI={dayBalance?.closingUPIActual ?? null}
        onSaveActualCash={(val) => saveBalance("closingCashActual", val)}
        onSaveActualUPI={(val) => saveBalance("closingUPIActual", val)}
        isToday={isToday}
        openingSet={!!dayBalance}
      />

      {/* Undo Delete Bar */}
      {deletedBackup && (
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl animate-in slide-in-from-bottom duration-200">
          <span className="text-sm text-[var(--text-secondary)]">Entry deleted</span>
          <button
            type="button"
            onClick={handleUndo}
            className="text-sm font-bold text-[var(--accent)] active:scale-95 transition-transform"
          >
            Undo
          </button>
        </div>
      )}

      {/* 7. Budget */}
      <BudgetSection budgetStatus={budgetStatus} />

      {/* 8. Payment Mode Filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {filterModes.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-xs font-bold rounded-xl uppercase tracking-wider transition-all flex-shrink-0 active:scale-95 ${
              filter === f
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* 9. Transaction List — Expenses */}
      <section>
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-3 px-1">
          <IndianRupee size={14} className="text-[var(--text-secondary)]" />
          EXPENSES — {format(selectedDate, "MMM d")}
        </h2>
        {filteredEntries.length === 0 ? (
          <EmptyState
            title="No expenses"
            subtitle="Use the + button to add an expense."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {Object.entries(timeGroups).map(([label, groupEntries]) => (
              <TransactionGroup
                key={label}
                label={label}
                entries={groupEntries}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </section>

      {/* 10. Income Section */}
      {incomeEntries.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-[var(--money-income)] flex items-center gap-2 mb-3 px-1">
            <IndianRupee size={14} />
            INCOME — {format(selectedDate, "MMM d")}
          </h2>
          <div className="flex flex-col gap-4">
            {Object.entries(incomeGroups).map(([label, groupEntries]) => (
              <TransactionGroup
                key={label}
                label={label}
                entries={groupEntries}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </section>
      )}

      {/* 11. Quick Add */}
      <QuickAddStrip
        templates={recurringTemplates}
        selectedDate={dateStr}
        onQuickAdd={handleQuickAdd}
      />

      {/* 12. Add/Edit Sheet */}
      <AddMoneySheet
        selectedDate={dateStr}
        editEntry={editEntry}
        onClearEdit={() => setEditEntry(null)}
      />
    </div>
  );
}
