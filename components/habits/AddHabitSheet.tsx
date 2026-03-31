"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useUIStore } from "@/store/uiStore";
import { HABIT_ICONS, HABIT_COLORS, HABIT_STACK_GROUPS } from "@/lib/constants";

export function AddHabitSheet() {
  const { activeSheet, closeSheet, addToast } = useUIStore();
  const { mutate } = useSWRConfig();

  const [name, setName] = useState("");
  const [type, setType] = useState<"build" | "quit">("build");
  const [icon, setIcon] = useState("📚");
  const [color, setColor] = useState("#6c63ff");
  const [freqType, setFreqType] = useState<"daily" | "weekly" | "custom">("daily");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [stackGroup, setStackGroup] = useState("morning");
  const [category, setCategory] = useState("personal");
  const [isLoading, setIsLoading] = useState(false);

  const toggleDay = (d: number) => {
    setDaysOfWeek(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return addToast({ message: "Name required", type: "error" });

    setIsLoading(true);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          icon,
          color,
          frequency: { type: freqType, daysOfWeek: freqType === "weekly" ? daysOfWeek : undefined },
          stackGroup,
          category,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      addToast({ message: "Habit created!", type: "success" });
      setName("");
      closeSheet();
      mutate((key: any) => typeof key === "string" && key.startsWith("/api/habits"));
    } catch (err: any) {
      addToast({ message: err.message || "Failed", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <BottomSheet isOpen={activeSheet === "habit"} onClose={closeSheet}>
      <div className="flex flex-col gap-5 max-h-[85vh] overflow-y-auto pb-4">
        <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">New Habit</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Habit Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Read 10 pages" required />

          {/* Type Toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Type</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setType("build")}
                className={`flex-1 py-2 text-sm font-bold rounded-xl transition-colors ${type === "build" ? "bg-[var(--accent-green)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"}`}>
                Build 🟢
              </button>
              <button type="button" onClick={() => setType("quit")}
                className={`flex-1 py-2 text-sm font-bold rounded-xl transition-colors ${type === "quit" ? "bg-[var(--accent-red)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"}`}>
                Quit 🔴
              </button>
            </div>
          </div>

          {/* Icon Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Icon</label>
            <div className="grid grid-cols-8 gap-2">
              {HABIT_ICONS.map((ic) => (
                <button key={ic} type="button" onClick={() => setIcon(ic)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${icon === ic ? "bg-[var(--accent)] shadow-md scale-110" : "bg-[var(--bg-elevated)] border border-[var(--border)]"}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Color</label>
            <div className="flex gap-2">
              {HABIT_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-[var(--accent)] scale-110" : ""}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Frequency</label>
            <div className="flex gap-2">
              {(["daily", "weekly", "custom"] as const).map(f => (
                <button key={f} type="button" onClick={() => setFreqType(f)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl capitalize transition-colors ${freqType === f ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"}`}>
                  {f}
                </button>
              ))}
            </div>
            {freqType === "weekly" && (
              <div className="flex gap-1.5 mt-2">
                {dayNames.map((d, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)}
                    className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${daysOfWeek.includes(i) ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"}`}>
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stack Group */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Stack Group</label>
            <div className="grid grid-cols-2 gap-2">
              {HABIT_STACK_GROUPS.map((sg) => (
                <button key={sg.id} type="button" onClick={() => setStackGroup(sg.id)}
                  className={`py-2 text-xs font-bold rounded-xl transition-colors ${stackGroup === sg.id ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"}`}>
                  {sg.label}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" isLoading={isLoading} className="mt-2 w-full">
            Create Habit
          </Button>
        </form>
      </div>
    </BottomSheet>
  );
}
