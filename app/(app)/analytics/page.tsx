"use client";

import { useState } from "react";
import useSWR from "swr";
import { format, subDays, startOfWeek, startOfMonth } from "date-fns";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from "recharts";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { DownloadCloud, PieChart as PieIcon } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

const fetcher = (url: string) => fetch(url).then(r => r.json());

const CHART_COLORS = ["#6c63ff", "#3b82f6", "#22c55e", "#f59e0b", "#ec4899", "#14b8a6", "#ef4444", "#8b5cf6", "#6b7280", "#f97316", "#06b6d4", "#84cc16"];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"today" | "week" | "month">("week");
  const { data, isLoading } = useSWR(`/api/analytics/summary?period=${period}`, fetcher);
  const { addToast } = useUIStore();

  const handleExport = async (fmt: "json" | "csv") => {
    try {
      const res = await fetch(`/api/analytics/export?format=${fmt}`);
      if (fmt === "csv") {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `selfix_export.${fmt}`;
        a.click();
      } else {
        const d = await res.json();
        const blob = new Blob([JSON.stringify(d.data, null, 2)], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "selfix_export.json";
        a.click();
      }
      addToast({ message: `Exported as ${fmt.toUpperCase()}!`, type: "success" });
    } catch {
      addToast({ message: "Export failed", type: "error" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full pb-24">
        <Skeleton height="40px" rounded="xl" />
        <Skeleton height="200px" rounded="2xl" />
        <Skeleton height="300px" rounded="2xl" />
      </div>
    );
  }

  const d = data?.data || {};

  // Build chart data from server response
  const scoreData = [{ name: "Score", value: d.dailyScore || 0, fill: "var(--accent)" }];

  const breakdownData = [
    { name: "Habits", weight: 30, score: d.habits?.score || 0 },
    { name: "Activity", weight: 25, score: d.activity?.score || 0 },
    { name: "Money", weight: 20, score: d.money?.budgetScore || 0 },
    { name: "Health", weight: 15, score: d.health?.score || 0 },
    { name: "Journal", weight: 10, score: d.journal?.written ? 100 : 0 },
  ];

  return (
    <div className="flex flex-col gap-6 pb-24 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <PieIcon size={18} className="text-[var(--accent)]" /> Analytics
        </h1>
        <div className="flex gap-2">
          <button onClick={() => handleExport("json")}
            className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" title="Export JSON">
            <DownloadCloud size={16} />
          </button>
          <button onClick={() => handleExport("csv")}
            className="px-3 h-9 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            CSV
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {(["today", "week", "month"] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg capitalize tracking-wider transition-colors ${period === p ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"}`}>
            {p === "today" ? "Today" : p === "week" ? "This Week" : "This Month"}
          </button>
        ))}
      </div>

      {/* Overall Score */}
      <Card className="flex flex-col items-center p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest mb-4">Overall Score</h2>
        <div className="text-6xl font-extrabold text-[var(--accent)]">{d.dailyScore || 0}</div>
        <p className="text-xs text-[var(--text-muted)] mt-2">out of 100</p>
      </Card>

      {/* Score Breakdown */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest mb-4">Score Breakdown</h3>
        <div className="flex flex-col gap-3">
          {breakdownData.map(b => (
            <div key={b.name} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[var(--text-secondary)]">{b.name} ({b.weight}%)</span>
                <span className="text-[var(--text-primary)]">{b.score}/100</span>
              </div>
              <div className="w-full h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--accent)] rounded-full transition-all" style={{ width: `${b.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Money Summary */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest mb-4">Money</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-extrabold text-[var(--accent-red)]">₹{d.money?.todaySpent || 0}</p>
            <p className="text-xs text-[var(--text-muted)]">Spent</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[var(--accent-green)]">{d.money?.budgetScore || 0}%</p>
            <p className="text-xs text-[var(--text-muted)]">Budget Health</p>
          </div>
        </div>
      </Card>

      {/* Habits */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest mb-4">Habits</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-extrabold text-[var(--text-primary)]">{d.habits?.completed || 0}/{d.habits?.total || 0}</p>
            <p className="text-xs text-[var(--text-muted)]">Completed</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[var(--accent)]">{d.habits?.score || 0}%</p>
            <p className="text-xs text-[var(--text-muted)]">Completion Rate</p>
          </div>
        </div>
      </Card>

      {/* Activity */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest mb-4">Activity</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-extrabold text-[var(--text-primary)]">{Math.floor((d.activity?.totalMinutes || 0) / 60)}h {(d.activity?.totalMinutes || 0) % 60}m</p>
            <p className="text-xs text-[var(--text-muted)]">Total Active</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[var(--accent-amber)]">🍅 {d.activity?.pomodoroCount || 0}</p>
            <p className="text-xs text-[var(--text-muted)]">Pomodoros</p>
          </div>
        </div>
      </Card>

      {/* Health */}
      <Card className="p-5">
        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest mb-4">Health</h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-extrabold text-blue-400">{d.health?.waterLogged || 0}/{d.health?.waterGoal || 8}</p>
            <p className="text-xs text-[var(--text-muted)]">Water (glasses)</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-[var(--text-primary)]">{d.health?.score || 0}%</p>
            <p className="text-xs text-[var(--text-muted)]">Health Score</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
