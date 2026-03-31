"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useUIStore } from "@/store/uiStore";
import { MONEY_CATEGORIES, PAYMENT_MODES } from "@/lib/constants";

interface Props {
  selectedDate?: string;
}

export function AddMoneySheet({ selectedDate }: Props) {
  const { activeSheet, closeSheet, addToast } = useUIStore();
  const { mutate } = useSWRConfig();

  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [category, setCategory] = useState("food");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return addToast({ message: "Enter a valid amount", type: "error" });
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          type,
          paymentMode,
          category,
          note,
          date: selectedDate,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      addToast({ message: "Transaction saved!", type: "success" });
      setAmount("");
      setNote("");
      closeSheet();
      mutate((key: any) => typeof key === "string" && key.startsWith("/api/money"));
    } catch (err: any) {
      addToast({ message: err.message || "Failed to save", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BottomSheet isOpen={activeSheet === "money"} onClose={closeSheet}>
      <div className="flex flex-col gap-5 max-h-[85vh] overflow-y-auto pb-4">
        <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Add Transaction</h2>

        {/* Type Toggle */}
        <div className="flex bg-[var(--bg-elevated)] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${type === "expense" ? "bg-[var(--accent-red)] text-white" : "text-[var(--text-secondary)]"}`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${type === "income" ? "bg-[var(--accent-green)] text-white" : "text-[var(--text-secondary)]"}`}
          >
            Income
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Amount */}
          <Input
            label="Amount (₹)"
            type="number"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            required
          />

          {/* Payment Mode */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Payment Mode</label>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_MODES.map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPaymentMode(pm.id)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    paymentMode === pm.id
                      ? "bg-[var(--accent)] text-white shadow-sm"
                      : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"
                  }`}
                >
                  <span className="text-lg">{pm.icon}</span>
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Grid */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {MONEY_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all ${
                    category === cat.id
                      ? "bg-[var(--accent)] text-white shadow-sm"
                      : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"
                  }`}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span className="truncate w-full text-center">{cat.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Details..."
          />

          <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
            Save Transaction
          </Button>
        </form>
      </div>
    </BottomSheet>
  );
}
