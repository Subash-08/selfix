"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { Droplet, Moon, Dumbbell, Apple, Activity, Weight, Star, Trash2, Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DateNavigator } from "@/components/ui/DateNavigator";
import { WORKOUT_TYPES } from "@/lib/constants";
import { useUIStore } from "@/store/uiStore";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function HealthPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data, isLoading, mutate } = useSWR(`/api/health?date=${dateStr}`, fetcher);
  const { activeSheet, closeSheet, addToast, openSheet } = useUIStore();

  const log = data?.data || { water: { logged: 0, goal: 8 }, sleep: {}, workout: [], steps: { count: 0, goal: 10000 }, calories: { consumed: 0, goal: 2000 }, meals: [], bodyMetrics: {} };

  // Workout form state
  const [wType, setWType] = useState("Gym");
  const [wDuration, setWDuration] = useState("");
  const [wNotes, setWNotes] = useState("");
  const [wSaving, setWSaving] = useState(false);

  // Meal form state
  const [mName, setMName] = useState("");
  const [mCals, setMCals] = useState("");
  const [mProtein, setMProtein] = useState("");
  const [mCarbs, setMCarbs] = useState("");
  const [mFat, setMFat] = useState("");
  const [showMealForm, setShowMealForm] = useState(false);

  const postAction = async (action: string, payload: any = {}) => {
    try {
      await fetch("/api/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, date: dateStr, ...payload }),
      });
      mutate();
    } catch {
      addToast({ message: "Failed to update", type: "error" });
    }
  };

  const handleAddWater = (ml: number) => postAction("add_water", { amount: ml });

  const handleSaveSleep = async (bedtime: string, wakeTime: string, quality: number) => {
    await postAction("log_sleep", { bedtime, wakeTime, quality });
    addToast({ message: "Sleep logged!", type: "success" });
  };

  const handleSaveWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wDuration) return;
    setWSaving(true);
    await postAction("log_workout", { workoutType: wType, duration: Number(wDuration), notes: wNotes });
    addToast({ message: "Workout logged!", type: "success" });
    setWDuration(""); setWNotes("");
    closeSheet();
    setWSaving(false);
  };

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mName || !mCals) return;
    await postAction("log_meal", { name: mName, calories: Number(mCals), protein: Number(mProtein) || 0, carbs: Number(mCarbs) || 0, fat: Number(mFat) || 0 });
    addToast({ message: "Meal logged!", type: "success" });
    setMName(""); setMCals(""); setMProtein(""); setMCarbs(""); setMFat("");
    setShowMealForm(false);
  };

  const waterPct = Math.min(100, ((log.water?.logged || 0) / (log.water?.goal || 8)) * 100);
  const calPct = Math.min(100, ((log.calories?.consumed || 0) / (log.calories?.goal || 2000)) * 100);
  const stepsPct = Math.min(100, ((log.steps?.count || 0) / (log.steps?.goal || 10000)) * 100);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full pb-24">
        <Skeleton height="52px" rounded="xl" />
        <Skeleton height="150px" rounded="2xl" />
        <Skeleton height="150px" rounded="2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-24 animate-in fade-in duration-300">
      <DateNavigator selectedDate={selectedDate} onChange={setSelectedDate} />

      {/* 💧 Water */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 sticky top-0 bg-[var(--bg-primary)] py-2 z-10">
          <Droplet size={16} className="text-blue-400" /> Water
        </h2>
        <Card className="flex items-center gap-5 p-5">
          <ProgressRing value={waterPct} size={100} strokeWidth={8} color="#3b82f6">
            <span className="text-lg font-extrabold text-[var(--text-primary)]">{log.water?.logged || 0}</span>
            <span className="text-[9px] font-bold text-[var(--text-muted)]">/ {log.water?.goal || 8} glasses</span>
          </ProgressRing>
          <div className="flex flex-col gap-2 flex-1">
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map(n => (
                <button key={n} onClick={() => handleAddWater(n)}
                  className="py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors active:scale-95">
                  +{n}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* 😴 Sleep */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 sticky top-0 bg-[var(--bg-primary)] py-2 z-10">
          <Moon size={16} className="text-indigo-400" /> Sleep
        </h2>
        <Card className="flex flex-col gap-3 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Bedtime</label>
              <input type="time" defaultValue={log.sleep?.bedtime || ""} id="sleep-bed"
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm mt-1 focus:border-[var(--accent)] focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Wake Up</label>
              <input type="time" defaultValue={log.sleep?.wakeTime || ""} id="sleep-wake"
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm mt-1 focus:border-[var(--accent)] focus:outline-none" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Quality</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map(q => (
                <button key={q} onClick={() => {
                  const bed = (document.getElementById("sleep-bed") as HTMLInputElement)?.value;
                  const wake = (document.getElementById("sleep-wake") as HTMLInputElement)?.value;
                  handleSaveSleep(bed, wake, q);
                }}
                  className={`flex-1 py-2 rounded-lg text-sm transition-all ${(log.sleep?.quality || 0) >= q ? "bg-[var(--accent-amber)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)]"}`}>
                  <Star size={14} className={`mx-auto ${(log.sleep?.quality || 0) >= q ? "fill-white" : ""}`} />
                </button>
              ))}
            </div>
          </div>
          {log.sleep?.durationMinutes && (
            <p className="text-sm font-bold text-[var(--text-primary)]">{Math.floor(log.sleep.durationMinutes / 60)}h {log.sleep.durationMinutes % 60}m sleep</p>
          )}
        </Card>
      </section>

      {/* 🏋️ Workout */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 sticky top-0 bg-[var(--bg-primary)] py-2 z-10">
          <Dumbbell size={16} className="text-orange-400" /> Workouts
        </h2>
        {(log.workout || []).length === 0 ? (
          <div className="p-4 rounded-2xl border-2 border-dashed border-[var(--border-hover)] text-center text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">
            No workouts yet
          </div>
        ) : (
          (log.workout || []).map((w: any, i: number) => (
            <Card key={i} className="flex justify-between items-center p-4">
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">{w.type}</h4>
                <p className="text-xs text-[var(--text-muted)]">{w.duration}min{w.notes ? ` · ${w.notes}` : ""}</p>
              </div>
              <button onClick={() => postAction("remove_workout", { index: i })}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-colors">
                <Trash2 size={14} />
              </button>
            </Card>
          ))
        )}
        <Button variant="secondary" size="sm" onClick={() => openSheet("health-workout")}>
          <Plus size={14} className="mr-1" /> Log Workout
        </Button>
      </section>

      {/* 🥗 Nutrition */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 sticky top-0 bg-[var(--bg-primary)] py-2 z-10">
          <Apple size={16} className="text-green-400" /> Nutrition
        </h2>
        <Card className="flex items-center gap-4 p-5">
          <ProgressRing value={calPct} size={80} strokeWidth={7} color="#22c55e">
            <span className="text-sm font-extrabold text-[var(--text-primary)]">{log.calories?.consumed || 0}</span>
            <span className="text-[8px] font-bold text-[var(--text-muted)]">kcal</span>
          </ProgressRing>
          <div className="flex-1 text-xs text-[var(--text-muted)]">
            Goal: {log.calories?.goal || 2000} kcal
          </div>
        </Card>
        {(log.meals || []).map((m: any, i: number) => (
          <Card key={i} className="p-3 flex justify-between">
            <span className="text-sm font-bold text-[var(--text-primary)]">{m.name}</span>
            <span className="text-sm font-bold text-[var(--accent-green)]">{m.calories} kcal</span>
          </Card>
        ))}
        {showMealForm ? (
          <Card className="p-4">
            <form onSubmit={handleSaveMeal} className="flex flex-col gap-3">
              <Input label="Meal Name" value={mName} onChange={e => setMName(e.target.value)} placeholder="e.g. Lunch" required />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Calories" type="number" value={mCals} onChange={e => setMCals(e.target.value)} required />
                <Input label="Protein (g)" type="number" value={mProtein} onChange={e => setMProtein(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">Save Meal</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowMealForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setShowMealForm(true)}>
            <Plus size={14} className="mr-1" /> Log Meal
          </Button>
        )}
      </section>

      {/* 👟 Steps */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 sticky top-0 bg-[var(--bg-primary)] py-2 z-10">
          <Activity size={16} className="text-amber-400" /> Steps
        </h2>
        <Card className="flex items-center gap-4 p-5">
          <div className="flex-1">
            <input type="number" defaultValue={log.steps?.count || 0}
              onBlur={e => postAction("update_steps", { count: Number(e.target.value) })}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-lg font-bold focus:border-[var(--accent)] focus:outline-none" />
            <p className="text-xs text-[var(--text-muted)] mt-1">Goal: {log.steps?.goal || 10000} steps</p>
          </div>
          <ProgressRing value={stepsPct} size={60} strokeWidth={5} color="#f59e0b" />
        </Card>
      </section>

      {/* 📏 Weight */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 sticky top-0 bg-[var(--bg-primary)] py-2 z-10">
          <Weight size={16} className="text-purple-400" /> Weight
        </h2>
        <Card className="p-5">
          <input type="number" step="0.1" defaultValue={log.bodyMetrics?.weight || ""}
            placeholder="Enter weight (kg)"
            onBlur={e => { if (e.target.value) postAction("update_weight", { weight: Number(e.target.value) }); }}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] font-bold focus:border-[var(--accent)] focus:outline-none placeholder:text-[var(--text-muted)]" />
        </Card>
      </section>

      {/* Workout BottomSheet */}
      <BottomSheet isOpen={activeSheet === "health" || activeSheet === "health-workout"} onClose={closeSheet}>
        <div className="flex flex-col gap-5 pb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Log Workout</h2>
          <form onSubmit={handleSaveWorkout} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Type</label>
              <select value={wType} onChange={e => setWType(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none">
                {WORKOUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Duration (min)" type="number" value={wDuration} onChange={e => setWDuration(e.target.value)} required />
            <Input label="Notes (optional)" value={wNotes} onChange={e => setWNotes(e.target.value)} />
            <Button type="submit" isLoading={wSaving} className="w-full">Save Workout</Button>
          </form>
        </div>
      </BottomSheet>
    </div>
  );
}
