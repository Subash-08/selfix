"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { DownloadCloud, PieChart as PieIcon, Trophy, Timer } from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { ACTIVITY_CATEGORIES, MOOD_OPTIONS } from "@/lib/constants";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then(r => r.json());

const CHART_COLORS = [
  "#6c63ff", "#3b82f6", "#22c55e", "#f59e0b",
  "#ec4899", "#14b8a6", "#ef4444", "#8b5cf6",
  "#6b7280", "#f97316",
];

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--text-primary)",
    fontSize: "12px",
  },
};

const AXIS_TICK = { fill: "var(--text-muted)", fontSize: 11 };

type Period = "today" | "week" | "month";
type Tab = "overview" | "money" | "activity" | "habits" | "tasks" | "journal";

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function fmtDate(dateStr: string | number | undefined | any): string {
  if (!dateStr) return "";
  const str = String(dateStr);
  try {
    return format(new Date(str + "T00:00:00"), "MMM d");
  } catch {
    return str;
  }
}

function scoreColor(score: number): string {
  if (score >= 70) return "var(--accent-green, #22c55e)";
  if (score >= 40) return "#eab308";
  return "var(--accent-red, #ef4444)";
}

function coverageColor(pct: number): string {
  if (pct >= 80) return "#22c55e";
  if (pct >= 50) return "#eab308";
  return "#ef4444";
}

// ─── Custom Bar Cell for coverage chart ────────────────────────────────
function CoverageBars({ data }: { data: { date: string; pct: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" tickFormatter={fmtDate} tick={AXIS_TICK} />
        <YAxis tickFormatter={v => `${v}%`} tick={AXIS_TICK} domain={[0, 100]} />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(v: any) => [`${v}%`, "Coverage"]}
          labelFormatter={fmtDate}
        />
        <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={coverageColor(entry.pct)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Loading skeleton ───────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton height="120px" rounded="2xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton height="80px" rounded="2xl" />
        <Skeleton height="80px" rounded="2xl" />
        <Skeleton height="80px" rounded="2xl" />
        <Skeleton height="80px" rounded="2xl" />
      </div>
      <Skeleton height="220px" rounded="2xl" />
      <Skeleton height="200px" rounded="2xl" />
    </div>
  );
}

// ─── Sub-section label ──────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-3">{children}</h3>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card className="flex flex-col items-center justify-center text-center py-4 gap-1">
      <p className="text-xl font-extrabold" style={{ color: color || "var(--text-primary)" }}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [tab, setTab] = useState<Tab>("overview");
  const { data, isLoading } = useSWR(`/api/analytics/summary?period=${period}`, fetcher, { keepPreviousData: true });
  const { addToast } = useUIStore();

  const handleExport = async (fmt: "json" | "csv") => {
    try {
      const res = await fetch(`/api/analytics/export?format=${fmt}`);
      if (fmt === "csv") {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "selfix_export.csv"; a.click();
      } else {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "selfix_export.json"; a.click();
      }
      addToast({ message: `Exported as ${fmt.toUpperCase()}!`, type: "success" });
    } catch {
      addToast({ message: "Export failed", type: "error" });
    }
  };

  const d = data?.data || {};
  const money = d.money || {};
  const habits = d.habits || {};
  const activity = d.activity || {};
  const journal = d.journal || {};
  const tasks = d.tasks || {};

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "money", label: "Money" },
    { id: "activity", label: "Activity" },
    { id: "habits", label: "Habits" },
    { id: "tasks", label: "Tasks" },
    { id: "journal", label: "Journal" },
  ];

  return (
    <div className="flex flex-col gap-5 pb-24 animate-in fade-in duration-300">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <PieIcon size={18} className="text-[var(--accent)]" /> Analytics
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("json")}
            className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Export JSON"
          >
            <DownloadCloud size={16} />
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="px-3 h-9 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            CSV
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {(["today", "week", "month"] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg capitalize tracking-wider transition-colors ${period === p
              ? "bg-[var(--accent)] text-white"
              : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"
              }`}
          >
            {p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
          </button>
        ))}
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors shrink-0 ${tab === t.id
              ? "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--accent)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════ */}
          {/* OVERVIEW TAB                                           */}
          {/* ═══════════════════════════════════════════════════════ */}
          {tab === "overview" && (
            <div className="flex flex-col gap-5">
              {/* Daily Score */}
              <Card className="flex flex-col items-center p-6 gap-2">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Daily Score</p>
                <p className="text-7xl font-extrabold text-[var(--accent)]">{d.dailyScore || 0}</p>
                <p className="text-xs text-[var(--text-muted)]">out of 100</p>
              </Card>

              {/* Score breakdown bars */}
              <Card className="p-5">
                <SectionTitle>Score Breakdown</SectionTitle>
                <div className="flex flex-col gap-3">
                  {[
                    { label: "Habits", weight: 25, score: habits.score || 0 },
                    { label: "Activity", weight: 25, score: activity.score || 0 },
                    { label: "Money", weight: 20, score: money.budgetScore ?? 50 },
                    { label: "Tasks", weight: 20, score: tasks.todayPct || 0 },
                    { label: "Journal", weight: 10, score: journal.written ? 100 : 0 },
                  ].map((b, i) => (
                    <div key={b.label} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[var(--text-secondary)]">{b.label} ({b.weight}%)</span>
                        <span className="text-[var(--text-primary)]">{b.score}/100</span>
                      </div>
                      <div className="w-full h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${b.score}%`, backgroundColor: CHART_COLORS[i] }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Quick stats 2x2 */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Total Spent" value={`₹${money.periodSpent || 0}`} color="#ef4444" />
                <StatCard label="Active Time" value={fmtDuration(activity.totalMinutes || 0)} color="#6c63ff" />
                <StatCard
                  label="Habits Done"
                  value={`${habits.completed || 0}/${habits.total || 0}`}
                  color="#f59e0b"
                />
                <StatCard label="Focus Sessions" value={`🍅 ${activity.pomodoroCount || 0}`} />
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* MONEY TAB                                              */}
          {/* ═══════════════════════════════════════════════════════ */}
          {tab === "money" && (
            <div className="flex flex-col gap-5">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Income" value={`₹${money.periodIncome || 0}`} color="#22c55e" />
                <StatCard label="Spent" value={`₹${money.periodSpent || 0}`} color="#ef4444" />
                <Card className="flex flex-col items-center justify-center text-center py-4 gap-1">
                  <p
                    className="text-xl font-extrabold"
                    style={{ color: (money.netSavings || 0) >= 0 ? "#6c63ff" : "#ef4444" }}
                  >
                    {(money.netSavings || 0) < 0 ? "–" : ""}₹{Math.abs(money.netSavings || 0)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Saved</p>
                </Card>
              </div>

              {/* Daily spend chart */}
              <Card className="p-4">
                <SectionTitle>Daily Spending</SectionTitle>
                {(money.periodSpent || 0) === 0 ? (
                  <EmptyState title="No expenses yet" subtitle="No expenses recorded for this period" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={money.dailySpend || []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tickFormatter={fmtDate} tick={AXIS_TICK} />
                      <YAxis tickFormatter={v => `₹${v}`} tick={AXIS_TICK} />
                      <Tooltip
                        {...TOOLTIP_STYLE}
                        formatter={(v: any) => [`₹${v}`, "Spent"]}
                        labelFormatter={fmtDate}
                      />
                      <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* Category breakdown */}
              <Card className="p-4">
                <SectionTitle>By Category</SectionTitle>
                {(money.topCategories || []).length === 0 ? (
                  <EmptyState title="No categories" subtitle="No category data for this period" />
                ) : (
                  <>
                    <div className="flex justify-center">
                      <PieChart width={200} height={200}>
                        <Pie
                          data={money.topCategories}
                          dataKey="total"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          strokeWidth={0}
                        >
                          {(money.topCategories || []).map((_: any, i: number) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [`₹${v}`, ""]} />
                      </PieChart>
                    </div>
                    <div className="flex flex-col gap-2 mt-2">
                      {(money.topCategories || []).map((cat: any, i: number) => (
                        <div key={cat.category} className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-[var(--text-secondary)] capitalize flex-1">{cat.category}</span>
                          <span className="font-bold text-[var(--text-primary)]">₹{cat.total.toFixed(0)}</span>
                          <span className="text-[var(--text-muted)]">{cat.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>

              {/* Savings rate */}
              <Card className="flex flex-col items-center justify-center text-center py-6 gap-1">
                <p
                  className="text-5xl font-extrabold"
                  style={{ color: (money.savingsRate || 0) > 20 ? "#22c55e" : (money.savingsRate || 0) > 0 ? "#eab308" : "#ef4444" }}
                >
                  {money.savingsRate || 0}%
                </p>
                <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Savings Rate</p>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* ACTIVITY TAB                                           */}
          {/* ═══════════════════════════════════════════════════════ */}
          {tab === "activity" && (
            <div className="flex flex-col gap-5">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Total Time" value={fmtDuration(activity.totalMinutes || 0)} />
                <StatCard label="Coverage" value={`${activity.coveragePct || 0}%`} />
                <StatCard label="Avg/Day" value={fmtDuration(activity.avgDailyMins || 0)} />
              </div>

              {(activity.totalMinutes || 0) === 0 ? (
                <EmptyState
                  title="No activities"
                  subtitle="No activities logged for this period"
                />
              ) : (
                <>
                  {/* Daily coverage chart */}
                  <Card className="p-4">
                    <SectionTitle>Daily Coverage</SectionTitle>
                    <CoverageBars data={activity.dailyCoverage || []} />
                  </Card>

                  {/* By category */}
                  <Card className="p-4">
                    <SectionTitle>Time by Category</SectionTitle>
                    <div className="flex flex-col gap-3">
                      {(activity.byCategory || []).map((cat: any, i: number) => {
                        const catDef = ACTIVITY_CATEGORIES.find(ac => ac.id === cat.category);
                        return (
                          <div key={cat.category} className="flex flex-col gap-1">
                            <div className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-1.5">
                                <span>{catDef?.icon || "📦"}</span>
                                <span className="font-medium text-[var(--text-primary)] capitalize">
                                  {catDef?.label || cat.category}
                                </span>
                              </div>
                              <span className="text-[var(--text-muted)]">{fmtDuration(cat.minutes)}</span>
                            </div>
                            <div className="w-full h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${cat.pct}%`,
                                  backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  {/* Top activities */}
                  <Card className="p-4">
                    <SectionTitle>Most Done Activities</SectionTitle>
                    <div className="flex flex-col gap-3">
                      {(activity.topActivities || []).map((act: any, i: number) => (
                        <div key={act.name} className="flex items-center gap-3">
                          <span className="text-xs font-black text-[var(--text-muted)] w-5 shrink-0">
                            #{i + 1}
                          </span>
                          <span className="text-sm font-medium text-[var(--text-primary)] flex-1 truncate">
                            {act.name}
                          </span>
                          <span className="text-xs text-[var(--text-secondary)] shrink-0">
                            {fmtDuration(act.totalMins)}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                            · {act.count} entries
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Focus timer card */}
                  <Card className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Timer size={16} className="text-[var(--accent)]" />
                      <SectionTitle>Focus Timer</SectionTitle>
                    </div>
                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="text-2xl font-extrabold text-[var(--text-primary)]">
                          {activity.pomodoroCount || 0}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">sessions</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-extrabold text-[var(--accent)]">
                          {fmtDuration(activity.focusMins || 0)}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">total focus</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xl tracking-widest">
                      {Array.from({ length: Math.min(activity.pomodoroCount || 0, 10) }).map((_, i) => (
                        <span key={i}>🍅</span>
                      ))}
                      {(activity.pomodoroCount || 0) === 0 && (
                        <span className="text-xs text-[var(--text-muted)]">No focus sessions yet</span>
                      )}
                    </p>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* HABITS TAB                                             */}
          {/* ═══════════════════════════════════════════════════════ */}
          {tab === "habits" && (
            <div className="flex flex-col gap-5">
              {(habits.total || 0) === 0 ? (
                <EmptyState title="No habits yet" subtitle="Set up habits to track them here" />
              ) : (
                <>
                  {/* Completion summary */}
                  <Card className="flex flex-row items-center justify-between p-5">
                    <div>
                      <p className="text-4xl font-extrabold text-[var(--text-primary)]">
                        {habits.completed || 0}
                        <span className="text-[var(--text-muted)]"> / {habits.total || 0}</span>
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">habits completed today</p>
                    </div>
                    <ProgressRing value={habits.score || 0} size={80} strokeWidth={8} color="var(--accent)">
                      <span className="text-lg font-extrabold text-[var(--text-primary)]">{habits.score || 0}%</span>
                    </ProgressRing>
                  </Card>

                  {/* Weekly heatmap */}
                  <Card className="p-4">
                    <SectionTitle>Last 7 Days</SectionTitle>
                    <div className="flex flex-col gap-2">
                      {(habits.weeklyData || []).map((day: any) => {
                        const pct = day.totalHabits > 0
                          ? Math.round((day.completedCount / day.totalHabits) * 100)
                          : 0;
                        return (
                          <div key={day.date} className="flex items-center gap-3">
                            <span className="text-xs font-bold text-[var(--text-muted)] w-8 shrink-0">
                              {format(new Date(day.date + "T00:00:00"), "EEE")}
                            </span>
                            <div className="flex-1 h-3 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: coverageColor(pct),
                                }}
                              />
                            </div>
                            <span className="text-xs text-[var(--text-secondary)] w-12 shrink-0 text-right">
                              {day.completedCount}/{day.totalHabits}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>

                  {/* Best habit */}
                  {habits.bestHabit && (
                    <Card className="p-4 flex items-center gap-4">
                      <span className="text-3xl">🏆</span>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Best Habit</p>
                        <p className="font-bold text-[var(--text-primary)]">
                          {habits.bestHabit.icon} {habits.bestHabit.name}
                        </p>
                        <p className="text-xs text-[var(--accent)]">
                          {habits.bestHabit.streak} day streak · longest streak
                        </p>
                      </div>
                    </Card>
                  )}

                  {/* Habit list */}
                  <Card className="p-4">
                    <SectionTitle>All Habits</SectionTitle>
                    <div className="flex flex-col gap-2">
                      {[...(habits.list || [])]
                        .sort((a: any, b: any) => Number(a.done) - Number(b.done))
                        .map((h: any) => (
                          <div
                            key={h._id}
                            className={`flex items-center gap-3 py-2 px-3 rounded-xl bg-[var(--bg-elevated)] transition-opacity ${h.done ? "opacity-50" : "opacity-100"}`}
                          >
                            <span className="text-xl">{h.icon}</span>
                            <span className="flex-1 text-sm font-medium text-[var(--text-primary)] truncate">{h.name}</span>
                            {h.done ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22c55e20] text-[#22c55e]">
                                ✓ Done
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eab30820] text-[#eab308]">
                                Pending
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* TASKS TAB                                              */}
          {/* ═══════════════════════════════════════════════════════ */}
          {tab === "tasks" && (
            <div className="flex flex-col gap-5">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label="Today"
                  value={`${tasks.todayCompleted || 0}/${tasks.todayTotal || 0}`}
                />
                <StatCard
                  label="Period"
                  value={`${tasks.periodCompleted || 0}/${tasks.periodTotal || 0}`}
                />
                <StatCard
                  label="Rate"
                  value={`${tasks.completionRate || 0}%`}
                  color={scoreColor(tasks.completionRate || 0)}
                />
              </div>

              {(tasks.periodTotal || 0) === 0 ? (
                <EmptyState title="No tasks" subtitle="No tasks for this period" />
              ) : (
                <>
                  {/* Daily completion chart */}
                  <Card className="p-4">
                    <SectionTitle>Daily Task Completion</SectionTitle>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart
                        data={tasks.dailyCompletion || []}
                        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tickFormatter={fmtDate} tick={AXIS_TICK} />
                        <YAxis tickFormatter={v => `${v}%`} tick={AXIS_TICK} domain={[0, 100]} />
                        <Tooltip
                          {...TOOLTIP_STYLE}
                          formatter={(v: any, n: any, p: any) => [
                            `${p.payload.completed}/${p.payload.total} (${v}%)`,
                            "Tasks",
                          ]}
                          labelFormatter={fmtDate}
                        />
                        <Line
                          type="monotone"
                          dataKey="pct"
                          stroke="var(--accent)"
                          strokeWidth={2}
                          dot={{ fill: "var(--accent)", r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>

                  {/* Completion rate card */}
                  <Card className="flex flex-col items-center justify-center text-center py-8 gap-1">
                    <p
                      className="text-6xl font-extrabold"
                      style={{ color: scoreColor(tasks.completionRate || 0) }}
                    >
                      {tasks.completionRate || 0}%
                    </p>
                    <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                      overall completion rate for this period
                    </p>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* JOURNAL TAB                                            */}
          {/* ═══════════════════════════════════════════════════════ */}
          {tab === "journal" && (
            <div className="flex flex-col gap-5">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label="Written Today"
                  value={journal.written ? "Yes ✓" : "Not yet"}
                  color={journal.written ? "#22c55e" : "var(--text-muted)"}
                />
                <StatCard label="Entries" value={`${journal.entriesCount || 0}`} />
                <StatCard label="Streak" value={`${journal.writingStreak || 0}d`} color="var(--accent)" />
              </div>

              {/* Today card */}
              <Link href="/journal">
                <Card className="p-4 hover:border-[var(--accent)] transition-colors cursor-pointer">
                  {journal.written && journal.preview ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{journal.moodEmoji || "✍️"}</span>
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Today's Entry</span>
                      </div>
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed italic">
                        "{journal.preview}"
                      </p>
                    </div>
                  ) : (
                    <EmptyState title="No entry today" subtitle="Write today's journal entry →" />
                  )}
                </Card>
              </Link>

              {/* Mood history */}
              <Card className="p-4">
                <SectionTitle>Mood This Period</SectionTitle>
                {(journal.moodHistory || []).length === 0 ? (
                  <EmptyState title="No entries" subtitle="No journal entries for this period" />
                ) : (
                  <>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                      {[...(journal.moodHistory || [])]
                        .slice(-14)
                        .map((entry: any, i: number) => (
                          <div
                            key={i}
                            className="flex flex-col items-center gap-1 shrink-0 bg-[var(--bg-elevated)] rounded-xl p-3 min-w-[72px]"
                          >
                            <span className="text-2xl">{entry.moodEmoji || "😐"}</span>
                            <span className="text-[9px] text-[var(--text-muted)] text-center">
                              {fmtDate(entry.date)}
                            </span>
                          </div>
                        ))}
                    </div>
                    {/* Most common mood */}
                    {(() => {
                      const freqMap: Record<string, number> = {};
                      for (const e of (journal.moodHistory || [])) {
                        const moodOption = MOOD_OPTIONS.find(m => m.value === e.mood);
                        const label = moodOption?.label || "Unknown";
                        freqMap[label] = (freqMap[label] || 0) + 1;
                      }
                      const mostCommon = Object.entries(freqMap).sort((a, b) => b[1] - a[1])[0];
                      if (!mostCommon) return null;
                      const moodOpt = MOOD_OPTIONS.find(m => m.label === mostCommon[0]);
                      return (
                        <p className="text-xs text-[var(--text-muted)] mt-3">
                          Most common mood: {moodOpt?.emoji} <span className="font-bold text-[var(--text-primary)]">{mostCommon[0]}</span>
                        </p>
                      );
                    })()}
                  </>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
