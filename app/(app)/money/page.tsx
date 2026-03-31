"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { IndianRupee, ArrowUpRight, ArrowDownRight, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { DateNavigator } from "@/components/ui/DateNavigator";
import { AddMoneySheet } from "@/components/money/AddMoneySheet";
import { MONEY_CATEGORIES } from "@/lib/constants";
import { useUIStore } from "@/store/uiStore";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function MoneyPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data, error, isLoading, mutate } = useSWR(`/api/money?date=${dateStr}`, fetcher);
  const { addToast } = useUIStore();

  const entries = data?.data?.entries || [];
  const computed = data?.data?.computedClosing || {};
  const dayBalance = data?.data?.dayBalance;
  const budgetStatus = data?.data?.todaysBudgetStatus || [];

  const [filter, setFilter] = useState<"all" | "cash" | "upi" | "card">("all");

  const filteredEntries = filter === "all"
    ? entries
    : entries.filter((e: any) => e.paymentMode === filter);

  const totalExpenses = entries.filter((e: any) => e.type === "expense").reduce((s: number, e: any) => s + e.amount, 0);
  const totalIncome = entries.filter((e: any) => e.type === "income").reduce((s: number, e: any) => s + e.amount, 0);

  const getCategoryIcon = (cat: string) => {
    const found = MONEY_CATEGORIES.find(c => c.id === cat.toLowerCase() || c.label.toLowerCase() === cat.toLowerCase());
    return found?.icon || "📦";
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/money/${id}`, { method: "DELETE" });
      mutate();
      addToast({ message: "Entry deleted", type: "success" });
    } catch {
      addToast({ message: "Failed to delete", type: "error" });
    }
  };

  // Day balance save
  const saveBalance = async (field: string, value: number) => {
    await fetch("/api/money/balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateStr, [field]: value }),
    });
    mutate();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full pb-24">
        <Skeleton height="52px" rounded="xl" />
        <Skeleton height="160px" rounded="2xl" />
        <Skeleton height="40px" width="200px" />
        <Skeleton height="80px" rounded="2xl" />
        <Skeleton height="80px" rounded="2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24 animate-in fade-in duration-300">
      <DateNavigator selectedDate={selectedDate} onChange={setSelectedDate} />

      {/* Day Balance Summary */}
      <Card className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Opening Cash</label>
            <input
              type="number"
              defaultValue={dayBalance?.openingCash || 0}
              onBlur={(e) => saveBalance("openingCash", Number(e.target.value))}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm font-bold mt-1 focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Opening UPI</label>
            <input
              type="number"
              defaultValue={dayBalance?.openingUPI || 0}
              onBlur={(e) => saveBalance("openingUPI", Number(e.target.value))}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm font-bold mt-1 focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        </div>
        <div className="border-t border-[var(--border)] pt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Cash</p>
            <p className="text-sm font-extrabold text-[var(--accent-red)]">₹{computed.totalSpentCash || 0}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">UPI</p>
            <p className="text-sm font-extrabold text-[var(--accent-red)]">₹{computed.totalSpentUPI || 0}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Card</p>
            <p className="text-sm font-extrabold text-[var(--accent-red)]">₹{computed.totalSpentCard || 0}</p>
          </div>
        </div>
        <div className="border-t border-[var(--border)] pt-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Total Spent</p>
              <p className="text-xl font-extrabold text-[var(--accent-red)]">₹{totalExpenses}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Income</p>
              <p className="text-xl font-extrabold text-[var(--accent-green)]">+₹{totalIncome}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Budget Status */}
      {budgetStatus.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3">BUDGET STATUS</h2>
          <div className="flex flex-col gap-2">
            {budgetStatus.map((b: any) => (
              <div key={b.category} className="flex flex-col gap-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[var(--text-primary)]">{getCategoryIcon(b.category)} {b.category}</span>
                  <span className={b.overspent ? "text-[var(--accent-red)]" : "text-[var(--text-secondary)]"}>
                    ₹{b.spent} / ₹{b.budget}
                  </span>
                </div>
                <div className="w-full h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${b.overspent ? "bg-[var(--accent-red)]" : "bg-[var(--accent-green)]"}`}
                    style={{ width: `${Math.min(100, (b.spent / b.budget) * 100)}%` }}
                  />
                </div>
                {b.overspent && <p className="text-[10px] font-bold text-[var(--accent-red)]">Over budget!</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["all", "cash", "upi", "card"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg uppercase tracking-wider transition-colors ${
              filter === f
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Entry List */}
      <section>
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-3">
          <IndianRupee size={14} className="text-[var(--text-secondary)]" />
          TRANSACTIONS — {format(selectedDate, "MMM d")}
        </h2>
        <div className="flex flex-col gap-2.5">
          {filteredEntries.length === 0 ? (
            <EmptyState title="No transactions" subtitle="Use the + button to add an entry." />
          ) : (
            filteredEntries.map((entry: any) => (
              <Card key={entry._id} className="flex justify-between items-center p-4 group">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                    entry.type === "income" ? "bg-green-500/10" : "bg-red-500/10"
                  }`}>
                    {getCategoryIcon(entry.category)}
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{entry.category}</h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      {entry.note || entry.paymentMode || "—"} · {format(new Date(entry.date), "h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-base font-bold ${entry.type === "income" ? "text-[var(--accent-green)]" : "text-[var(--text-primary)]"}`}>
                    {entry.type === "income" ? "+" : "-"}₹{entry.amount}
                  </span>
                  <button
                    onClick={() => handleDelete(entry._id)}
                    className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      <AddMoneySheet selectedDate={dateStr} />
    </div>
  );
}
