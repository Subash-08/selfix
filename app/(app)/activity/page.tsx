"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import { format, startOfDay } from "date-fns";
import { Timer, Play, Pause, RotateCcw, Coffee } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { DateNavigator } from "@/components/ui/DateNavigator";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ACTIVITY_CATEGORIES } from "@/lib/constants";
import { useUIStore } from "@/store/uiStore";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ActivityPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tab, setTab] = useState<"timeline" | "pomodoro">("timeline");
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data, isLoading, mutate } = useSWR(`/api/activities?date=${dateStr}`, fetcher);
  const { activeSheet, closeSheet, addToast, openSheet } = useUIStore();

  const entries = data?.data?.entries || data?.data || [];
  const totalMinutes = Array.isArray(entries) ? entries.reduce((s: number, a: any) => s + (a.durationMinutes || 0), 0) : 0;

  // --- Pomodoro ---
  const [workMins, setWorkMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [sessionsToday, setSessionsToday] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = phase === "work" ? workMins * 60 : breakMins * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  const handlePomodoroComplete = useCallback(async () => {
    if (phase === "work") {
      try {
        await fetch("/api/activities/pomodoro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ duration: workMins, date: dateStr }),
        });
        setSessionsToday(p => p + 1);
        addToast({ message: "🍅 Pomodoro complete!", type: "success" });
        mutate();
      } catch { /* ignore */ }
      setPhase("break");
      setTimeLeft(breakMins * 60);
    } else {
      setPhase("work");
      setTimeLeft(workMins * 60);
      addToast({ message: "Break over! Ready for next session.", type: "info" });
    }
    setIsRunning(false);
  }, [phase, workMins, breakMins, dateStr, addToast, mutate]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(p => {
          if (p <= 1) {
            clearInterval(intervalRef.current!);
            handlePomodoroComplete();
            return 0;
          }
          return p - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, handlePomodoroComplete]);

  const resetTimer = () => {
    setIsRunning(false);
    setPhase("work");
    setTimeLeft(workMins * 60);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  // Activity form
  const [actName, setActName] = useState("");
  const [actCategory, setActCategory] = useState("work");
  const [actStart, setActStart] = useState("");
  const [actEnd, setActEnd] = useState("");
  const [actSaving, setActSaving] = useState(false);

  const saveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actName || !actStart || !actEnd) return addToast({ message: "Fill all fields", type: "error" });
    setActSaving(true);
    try {
      await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: actName, category: actCategory, date: dateStr, startTime: actStart, endTime: actEnd, isPlanned: false }),
      });
      addToast({ message: "Activity logged!", type: "success" });
      setActName(""); setActStart(""); setActEnd("");
      closeSheet();
      mutate();
    } catch { addToast({ message: "Failed", type: "error" }); }
    finally { setActSaving(false); }
  };

  const getCatInfo = (cat: string) => ACTIVITY_CATEGORIES.find(c => c.id === cat) || ACTIVITY_CATEGORIES[7];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full pb-24">
        <Skeleton height="52px" rounded="xl" />
        <Skeleton height="200px" rounded="2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24 animate-in fade-in duration-300">
      <DateNavigator selectedDate={selectedDate} onChange={setSelectedDate} />

      <div className="flex gap-2">
        {(["timeline", "pomodoro"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg capitalize tracking-wider transition-colors ${tab === t ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"}`}>
            {t === "pomodoro" ? "🍅 Pomodoro" : "📋 Timeline"}
          </button>
        ))}
      </div>

      {tab === "timeline" && (
        <>
          <Card className="flex items-center justify-between p-4">
            <div>
              <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Total Active Time</p>
              <p className="text-2xl font-extrabold text-[var(--text-primary)]">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</p>
            </div>
            <ProgressRing value={Math.min(100, (totalMinutes / 480) * 100)} size={60} strokeWidth={6} color="var(--accent)" />
          </Card>

          {entries.length === 0 ? (
            <EmptyState title="No activities logged" subtitle="Use the + button to log an activity." />
          ) : (
            <div className="flex flex-col gap-2.5">
              {entries.map((entry: any) => {
                const catInfo = getCatInfo(entry.category);
                return (
                  <Card key={entry._id} className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: catInfo.color + "20" }}>
                      {catInfo.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">{entry.name}</h4>
                      <p className="text-xs text-[var(--text-muted)]">
                        {entry.startTime || ""} → {entry.endTime || ""} · {entry.durationMinutes || 0}m
                      </p>
                    </div>
                    <div className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: catInfo.color + "20", color: catInfo.color }}>
                      {catInfo.label}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "pomodoro" && (
        <div className="flex flex-col items-center gap-8 py-6">
          <div className="text-center">
            <span className={`text-sm font-bold uppercase tracking-widest ${phase === "work" ? "text-[var(--accent-red)]" : "text-[var(--accent-green)]"}`}>
              {phase === "work" ? "🍅 Focus" : "☕ Break"}
            </span>
          </div>

          <ProgressRing
            value={progress}
            size={220}
            strokeWidth={12}
            color={phase === "work" ? "var(--accent-red)" : "var(--accent-green)"}
          >
            <span className="text-5xl font-extrabold text-[var(--text-primary)] tabular-nums">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
          </ProgressRing>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={resetTimer} size="sm"><RotateCcw size={16} /></Button>
            <Button onClick={() => setIsRunning(!isRunning)} size="lg" className="px-10">
              {isRunning ? <Pause size={24} /> : <Play size={24} />}
            </Button>
          </div>

          <div className="flex gap-4 items-center text-center">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Work</label>
              <input type="number" value={workMins} onChange={e => { setWorkMins(Number(e.target.value)); if (!isRunning && phase === "work") setTimeLeft(Number(e.target.value) * 60); }}
                className="w-16 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-2 py-1.5 text-center text-[var(--text-primary)] font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Break</label>
              <input type="number" value={breakMins} onChange={e => { setBreakMins(Number(e.target.value)); if (!isRunning && phase === "break") setTimeLeft(Number(e.target.value) * 60); }}
                className="w-16 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-2 py-1.5 text-center text-[var(--text-primary)] font-bold" />
            </div>
          </div>

          <div className="flex gap-1">
            {Array.from({ length: sessionsToday }).map((_, i) => (
              <span key={i} className="text-xl">🍅</span>
            ))}
            {sessionsToday === 0 && <p className="text-xs text-[var(--text-muted)]">No sessions yet today</p>}
          </div>
        </div>
      )}

      {/* Add Activity Sheet */}
      <BottomSheet isOpen={activeSheet === "activity"} onClose={closeSheet}>
        <div className="flex flex-col gap-5 pb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Log Activity</h2>
          <form onSubmit={saveActivity} className="flex flex-col gap-4">
            <Input label="Activity Name" value={actName} onChange={e => setActName(e.target.value)} placeholder="e.g. Deep work session" required />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Category</label>
              <div className="grid grid-cols-4 gap-2">
                {ACTIVITY_CATEGORIES.map(cat => (
                  <button key={cat.id} type="button" onClick={() => setActCategory(cat.id)}
                    className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all ${actCategory === cat.id ? "text-white shadow-sm" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"}`}
                    style={actCategory === cat.id ? { backgroundColor: cat.color } : {}}>
                    <span className="text-lg">{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Time" type="time" value={actStart} onChange={e => setActStart(e.target.value)} required />
              <Input label="End Time" type="time" value={actEnd} onChange={e => setActEnd(e.target.value)} required />
            </div>
            <Button type="submit" isLoading={actSaving} className="w-full">Save Activity</Button>
          </form>
        </div>
      </BottomSheet>
    </div>
  );
}
