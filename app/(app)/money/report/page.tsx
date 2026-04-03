"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, subDays } from "date-fns";
import {
  ArrowUpRight, ArrowDownRight, Wallet, Percent, TrendingUp, TrendingDown,
  Filter, ChevronDown, Lightbulb, AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, ReferenceLine,
} from "recharts";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyTabSwitcher } from "@/components/money/MoneyTabSwitcher";
import { CategoryIcon } from "@/components/money/CategoryIcon";
import { EntryCard } from "@/components/money/EntryCard";
import { MONEY_CATEGORIES, PAYMENT_MODES } from "@/lib/constants";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Period = "today" | "week" | "month" | "year" | "custom";

function getDateRange(period: Period, customFrom?: string, customTo?: string) {
  const today = startOfDay(new Date());
  switch (period) {
    case "today":
      return { from: format(today, "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    case "week":
      return { from: format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    case "month":
      return { from: format(startOfMonth(today), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    case "year":
      return { from: format(startOfYear(today), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    case "custom":
      return { from: customFrom || format(subDays(today, 30), "yyyy-MM-dd"), to: customTo || format(today, "yyyy-MM-dd") };
  }
}

export default function MoneyReportPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const dateRange = getDateRange(period, customFrom, customTo);
  const apiUrl = `/api/money/report?from=${dateRange.from}&to=${dateRange.to}&page=${page}&limit=20`;

  const { data, error, isLoading } = useSWR(apiUrl, fetcher);

  const reportData = data?.data;
  const summary = reportData?.summary || { totalIncome: 0, totalExpenses: 0, net: 0, savingsRate: 0 };
  const byCategory = reportData?.byCategory || [];
  const byPaymentMode = reportData?.byPaymentMode || [];
  const byDay = reportData?.byDay || [];
  const incomeByCategory = reportData?.incomeByCategory || [];
  const transactions = reportData?.transactions || [];
  const totalTransactions = reportData?.totalTransactions || 0;
  const insights = reportData?.insights || [];

  const filteredTransactions = categoryFilter
    ? transactions.filter((t: { category: string }) => t.category === categoryFilter)
    : transactions;

  const avgDailySpend = useMemo(() => {
    if (byDay.length === 0) return 0;
    const totalExpenses = byDay.reduce((sum: number, d: { expenses: number }) => sum + d.expenses, 0);
    return totalExpenses / byDay.length;
  }, [byDay]);

  const periods: { key: Period; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "year", label: "Year" },
    { key: "custom", label: "Custom" },
  ];

  // ─── Loading ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pb-24">
        <MoneyTabSwitcher />
        <div className="flex gap-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} width="80px" height="36px" rounded="xl" />)}</div>
        <div className="flex gap-2.5 overflow-hidden">{[1, 2, 3, 4].map((i) => <Skeleton key={i} width="150px" height="90px" rounded="2xl" />)}</div>
        <Skeleton height="220px" rounded="2xl" />
        <Skeleton height="220px" rounded="2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 pb-24">
        <MoneyTabSwitcher />
        <EmptyState title="Failed to load report" subtitle="Please try again." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24 animate-in fade-in duration-300">
      {/* Tab Switcher */}
      <MoneyTabSwitcher />

      {/* Period Picker */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => { setPeriod(p.key); setPage(1); setCategoryFilter(null); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex-shrink-0 active:scale-95 ${
                period === p.key
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="flex-1 h-10 px-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
            <span className="flex items-center text-[var(--text-muted)] text-sm">→</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="flex-1 h-10 px-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        )}
      </div>

      {/* Section 1 — Summary Cards */}
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-1 px-1">
        {[
          { label: "Income", value: summary.totalIncome, icon: ArrowUpRight, color: "var(--money-income)", prefix: "+₹" },
          { label: "Expenses", value: summary.totalExpenses, icon: ArrowDownRight, color: "var(--money-expense)", prefix: "₹" },
          { label: "Net Savings", value: Math.abs(summary.net), icon: Wallet, color: summary.net >= 0 ? "var(--money-income)" : "var(--money-expense)", prefix: summary.net >= 0 ? "+₹" : "-₹" },
          { label: "Savings Rate", value: summary.savingsRate, icon: Percent, color: "var(--accent-blue)", prefix: "", suffix: "%" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="snap-start min-w-[150px] flex-shrink-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${card.color}15` }}>
                  <Icon size={16} style={{ color: card.color }} />
                </div>
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{card.label}</span>
              </div>
              <span className="amount text-xl font-bold" style={{ color: card.color }}>
                {card.prefix}{card.suffix ? card.value.toFixed(1) : card.value.toFixed(2)}{card.suffix || ""}
              </span>
            </div>
          );
        })}
      </div>

      {/* Section 2 — Income vs Expense Chart */}
      {byDay.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Income vs Expenses</h3>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={byDay} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                tickFormatter={(val: string) => format(new Date(val), "d")}
              />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="income" fill="var(--money-income)" radius={[4, 4, 0, 0]} barSize={12} />
              <Bar dataKey="expenses" fill="var(--money-expense)" radius={[4, 4, 0, 0]} barSize={12} />
              <Line type="monotone" dataKey="net" stroke="var(--accent)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Section 3 — Spending by Category */}
      {byCategory.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Spending by Category</h3>
          <div className="flex flex-col items-center gap-4">
            {/* Donut Chart */}
            <div className="relative">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="amount"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {byCategory.map((entry: { id: string; color: string }, idx: number) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="amount text-lg font-bold text-[var(--text-primary)]">
                  ₹{summary.totalExpenses.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Category List */}
            <div className="w-full flex flex-col gap-2">
              {byCategory.map((cat: { id: string; label: string; icon: string; color: string; amount: number; percentage: number }) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(categoryFilter === cat.id ? null : cat.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-all active:scale-[0.98] ${
                    categoryFilter === cat.id ? "bg-[var(--accent)]/10 border border-[var(--accent)]/30" : "hover:bg-[var(--bg-elevated)]"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cat.color}20` }}>
                    <CategoryIcon name={cat.icon} size={14} color={cat.color} />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)] flex-1 text-left">{cat.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                    </div>
                    <span className="amount text-xs font-bold text-[var(--text-secondary)] w-16 text-right">
                      ₹{cat.amount.toFixed(0)}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] w-8 text-right">
                      {cat.percentage.toFixed(0)}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Section 4 — Payment Mode Breakdown */}
      {byPaymentMode.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Payment Mode</h3>
          <div className="flex flex-col gap-3">
            {byPaymentMode.map((pm: { mode: string; amount: number; percentage: number; count: number }) => {
              const meta = PAYMENT_MODES.find((p) => p.id === pm.mode);
              const colors: Record<string, string> = { cash: "#22c55e", upi: "#6c63ff", card: "#f59e0b", bank: "#3b82f6" };
              const color = colors[pm.mode] || "#6b7280";
              return (
                <div key={pm.mode} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                    <CategoryIcon name={meta?.icon || "Banknote"} size={14} color={color} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-[var(--text-primary)] uppercase">{meta?.label || pm.mode}</span>
                      <span className="amount text-xs font-bold text-[var(--text-secondary)]">₹{pm.amount.toFixed(2)} ({pm.percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pm.percentage}%`, backgroundColor: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 5 — Income Breakdown */}
      {incomeByCategory.length > 0 && summary.totalIncome > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Income Sources</h3>
          <div className="flex flex-col gap-2">
            {incomeByCategory.map((src: { category: string; amount: number; percentage: number }) => {
              const cat = MONEY_CATEGORIES.find((c) => c.id === src.category.toLowerCase());
              return (
                <div key={src.category} className="flex items-center gap-3 p-2">
                  <CategoryIcon name={cat?.icon || "Briefcase"} size={14} color={cat?.color || "#22c55e"} />
                  <span className="text-sm font-semibold text-[var(--text-primary)] flex-1">{cat?.label || src.category}</span>
                  <span className="amount text-xs font-bold text-[var(--money-income)]">₹{src.amount.toFixed(2)}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{src.percentage.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section 6 — Daily Spending Trend */}
      {byDay.length > 1 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Daily Spending Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={byDay} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
              <defs>
                <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                tickFormatter={(val: string) => format(new Date(val), "d")}
              />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              <Area type="monotone" dataKey="expenses" stroke="var(--accent)" fill="url(#spendGradient)" strokeWidth={2} />
              <ReferenceLine y={avgDailySpend} stroke="var(--text-muted)" strokeDasharray="5 5" label={{ value: `Avg ₹${avgDailySpend.toFixed(0)}`, fill: "var(--text-muted)", fontSize: 10 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Section 7 — Transaction List */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Transactions</h3>
          {categoryFilter && (
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className="text-xs font-semibold text-[var(--accent)] active:scale-95"
            >
              Clear filter
            </button>
          )}
        </div>

        {filteredTransactions.length === 0 ? (
          <EmptyState title="No transactions" subtitle="No transactions found for this period." />
        ) : (
          <div className="flex flex-col gap-1.5">
            {filteredTransactions.map((entry: { _id: string; amount: number; type: "expense" | "income"; paymentMode: string; category: string; note?: string; date: string }) => (
              <EntryCard
                key={entry._id}
                entry={entry}
                onDelete={() => {}}
                onEdit={() => {}}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalTransactions > 20 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)] disabled:opacity-40 active:scale-95 transition-all"
            >
              Previous
            </button>
            <span className="text-xs text-[var(--text-muted)]">
              Page {page} of {Math.ceil(totalTransactions / 20)}
            </span>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page * 20 >= totalTransactions}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)] disabled:opacity-40 active:scale-95 transition-all"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Section 8 — Insights */}
      {insights.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 px-1">
            <Lightbulb size={14} className="text-[var(--accent-amber)]" />
            Insights
          </h3>
          <div className="flex flex-col gap-2">
            {insights.map((insight: string, idx: number) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl"
              >
                <div className="w-6 h-6 rounded-lg bg-[var(--accent-amber)]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lightbulb size={12} className="text-[var(--accent-amber)]" />
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no data at all */}
      {summary.totalIncome === 0 && summary.totalExpenses === 0 && (
        <EmptyState
          title="No data for this period"
          subtitle="Add some transactions to see your report."
        />
      )}
    </div>
  );
}
