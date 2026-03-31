"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { RotateCcw, CheckCircle2, XCircle, Flame } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { DateNavigator } from "@/components/ui/DateNavigator";
import { Heatmap } from "@/components/ui/Heatmap";
import { AddHabitSheet } from "@/components/habits/AddHabitSheet";
import { useUIStore } from "@/store/uiStore";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function HabitsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tab, setTab] = useState<"today" | "heatmap" | "manage">("today");
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data, error, isLoading, mutate } = useSWR(`/api/habits?date=${dateStr}`, fetcher);
  const { addToast } = useUIStore();

  const habits = data?.data?.habits || [];
  const completionRate = data?.data?.completionRate || 0;
  const stackGroups = data?.data?.stackGroups || [];

  const activeHabits = habits.filter((h: any) => h.active);
  const dueHabits = activeHabits.filter((h: any) => h.isDueToday);
  const completedCount = dueHabits.filter((h: any) => h.checkin?.completed).length;

  const handleCheckin = async (habitId: string, completed: boolean) => {
    try {
      await fetch("/api/habits/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, date: dateStr, completed }),
      });
      mutate();
    } catch {
      addToast({ message: "Failed to update", type: "error" });
    }
  };

  const handleArchive = async (habitId: string) => {
    try {
      await fetch(`/api/habits/${habitId}`, { method: "DELETE" });
      mutate();
      addToast({ message: "Habit archived", type: "success" });
    } catch {
      addToast({ message: "Failed to archive", type: "error" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full pb-24">
        <Skeleton height="52px" rounded="xl" />
        <Skeleton height="120px" rounded="2xl" />
        <Skeleton height="200px" rounded="2xl" />
      </div>
    );
  }

  // Group habits by stackGroup
  const grouped: Record<string, any[]> = { ungrouped: [] };
  stackGroups.forEach((g: string) => { grouped[g] = []; });
  dueHabits.forEach((h: any) => {
    const group = h.stackGroup || "ungrouped";
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(h);
  });

  const groupLabels: Record<string, string> = {
    morning: "Morning 🌅",
    afternoon: "Afternoon ☀️",
    evening: "Evening 🌙",
    anytime: "Anytime ⏰",
    ungrouped: "Habits",
  };

  return (
    <div className="flex flex-col gap-6 pb-24 animate-in fade-in duration-300">
      <DateNavigator selectedDate={selectedDate} onChange={setSelectedDate} />

      {/* Tabs */}
      <div className="flex gap-2">
        {(["today", "heatmap", "manage"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg capitalize tracking-wider transition-colors ${
              tab === t
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "today" && (
        <>
          {/* Completion Ring */}
          <div className="flex flex-col items-center py-4">
            <ProgressRing value={completionRate} size={140} strokeWidth={12} color="var(--accent-green)">
              <span className="text-2xl font-extrabold text-[var(--text-primary)]">{completedCount}/{dueHabits.length}</span>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Done</span>
            </ProgressRing>
          </div>

          {/* Habit List grouped by stackGroup */}
          {dueHabits.length === 0 ? (
            <EmptyState title="No habits due" subtitle="Create habits to start tracking." />
          ) : (
            Object.entries(grouped).map(([group, items]) => {
              if (items.length === 0) return null;
              return (
                <section key={group}>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 px-1">
                    {groupLabels[group] || group}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {items.map((habit: any) => {
                      const isDone = habit.checkin?.completed;
                      const streak = habit.streak?.currentStreak || 0;

                      return (
                        <Card
                          key={habit._id}
                          className={`flex items-center justify-between p-4 transition-all ${isDone ? "opacity-70" : ""}`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                              style={{ backgroundColor: (habit.color || "#6c63ff") + "20" }}
                            >
                              {habit.icon || "✅"}
                            </div>
                            <div>
                              <h4 className={`text-sm font-bold text-[var(--text-primary)] ${isDone ? "line-through" : ""}`}>
                                {habit.name}
                              </h4>
                              {streak > 0 && (
                                <span className="text-[10px] font-bold text-[var(--accent-amber)] flex items-center gap-0.5">
                                  <Flame size={10} /> {streak} day streak
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => handleCheckin(habit._id, !isDone)}
                            className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
                              isDone
                                ? habit.type === "quit"
                                  ? "bg-[var(--accent-red)] border-[var(--accent-red)] text-white"
                                  : "bg-[var(--accent-green)] border-[var(--accent-green)] text-white"
                                : "border-[var(--border-hover)] text-transparent hover:border-[var(--accent)]"
                            }`}
                          >
                            {habit.type === "quit" ? <XCircle size={18} /> : <CheckCircle2 size={18} strokeWidth={3} />}
                          </button>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </>
      )}

      {tab === "heatmap" && (
        <div className="flex flex-col gap-6">
          {activeHabits.length === 0 ? (
            <EmptyState title="No habits" subtitle="Create habits to see heatmaps." />
          ) : (
            activeHabits.map((habit: any) => (
              <Card key={habit._id} className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{habit.icon || "✅"}</span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">{habit.name}</span>
                  <span className="text-[10px] font-bold text-[var(--accent)] ml-auto">
                    {habit.streak?.currentStreak || 0} streak
                  </span>
                </div>
                <Heatmap habitId={habit._id} weeks={12} />
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "manage" && (
        <div className="flex flex-col gap-3">
          {habits.length === 0 ? (
            <EmptyState title="No habits" subtitle="Create your first habit!" />
          ) : (
            habits.map((habit: any) => (
              <Card key={habit._id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{habit.icon || "✅"}</span>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">{habit.name}</h4>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {habit.frequency?.type || "daily"} · {habit.type || "build"} · {habit.active ? "Active" : "Archived"}
                    </p>
                  </div>
                </div>
                {habit.active && (
                  <button
                    onClick={() => handleArchive(habit._id)}
                    className="text-xs font-bold text-[var(--accent-red)] hover:underline"
                  >
                    Archive
                  </button>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      <AddHabitSheet />
    </div>
  );
}
