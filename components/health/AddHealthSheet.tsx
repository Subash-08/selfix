"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useUIStore } from "@/store/uiStore";
import { Droplet, Dumbbell, Apple, Activity } from "lucide-react";

export function AddHealthSheet() {
  const { isAddHealthOpen, setAddHealthOpen, addToast } = useUIStore();
  const { mutate } = useSWRConfig();
  
  const [tab, setTab] = useState<"water" | "workout" | "meal" | "steps">("water");
  const [isLoading, setIsLoading] = useState(false);

  // Workout state
  const [wType, setWType] = useState("");
  const [wDuration, setWDuration] = useState("");

  // Meal state
  const [mName, setMName] = useState("");
  const [mCals, setMCals] = useState("");

  // Steps state
  const [steps, setSteps] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let payload: any = { action: "" };

    if (tab === "water") {
      payload.action = "add_water";
    } else if (tab === "workout") {
      if(!wType || !wDuration) {
          setIsLoading(false);
          return addToast({message: "Missing workout data", type: "error"});
      }
      payload.action = "log_workout";
      payload.workoutPayload = { type: wType, duration: Number(wDuration) };
    } else if (tab === "meal") {
      if(!mName || !mCals) {
          setIsLoading(false);
          return addToast({message: "Missing meal data", type: "error"});
      }
      payload.action = "log_meal";
      payload.mealPayload = { name: mName, calories: Number(mCals), time: "now" };
    } else if (tab === "steps") {
       if(!steps) {
         setIsLoading(false);
         return addToast({message: "Missing steps", type: "error"});
       }
       payload.action = "update_steps";
       payload.steps = Number(steps);
    }

    try {
      const res = await fetch("/api/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      addToast({ message: "Health log updated!", type: "success" });
      setAddHealthOpen(false);
      mutate('/api/health');

      // Reset
      setWType(""); setWDuration(""); setMName(""); setMCals(""); setSteps("");
    } catch (e: any) {
      addToast({ message: e.message || "Failed to update", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BottomSheet isOpen={isAddHealthOpen} onClose={() => setAddHealthOpen(false)}>
      <div className="flex flex-col gap-6 max-h-[85vh] overflow-y-auto pb-6">
        <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Log Health Data</h2>

        <div className="grid grid-cols-4 gap-2 bg-[var(--bg-elevated)] p-1.5 rounded-2xl border border-[var(--border)] shadow-inner">
           <button type="button" onClick={() => setTab("water")} className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all ${tab === 'water' ? 'bg-[var(--accent-blue)] text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-105' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
              <Droplet size={20} className={tab === 'water' ? "fill-white" : ""} />
              <span className="text-[9px] font-black uppercase tracking-widest">Water</span>
           </button>
           <button type="button" onClick={() => setTab("workout")} className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all ${tab === 'workout' ? 'bg-[var(--accent)] text-white shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)] scale-105' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
              <Dumbbell size={20} />
              <span className="text-[9px] font-black uppercase tracking-widest">Workout</span>
           </button>
           <button type="button" onClick={() => setTab("meal")} className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all ${tab === 'meal' ? 'bg-[var(--accent-green)] text-white shadow-[0_0_15px_rgba(34,197,94,0.5)] scale-105' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
              <Apple size={20} className={tab === 'meal' ? "fill-white" : ""} />
              <span className="text-[9px] font-black uppercase tracking-widest">Meal</span>
           </button>
           <button type="button" onClick={() => setTab("steps")} className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all ${tab === 'steps' ? 'bg-[var(--accent-amber)] text-white shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-105' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
              <Activity size={20} />
              <span className="text-[9px] font-black uppercase tracking-widest">Steps</span>
           </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
          
          {tab === "water" && (
            <div className="flex flex-col items-center justify-center p-8 gap-4 bg-[var(--accent-blue)]/5 rounded-2xl border border-[var(--accent-blue)]/10">
               <div className="w-24 h-24 bg-[var(--bg-elevated)] text-[var(--accent-blue)] rounded-full flex items-center justify-center border-4 border-[var(--accent-blue)] shadow-[0_0_20px_rgba(59,130,246,0.2)] glow animate-pulse">
                 <Droplet size={40} className="fill-[var(--accent-blue)] mt-2" />
               </div>
               <p className="text-sm font-bold text-[var(--text-primary)] tracking-tight">Log 1 Glass (250ml)</p>
            </div>
          )}

          {tab === "workout" && (
            <>
              <Input label="Workout Name" placeholder="e.g. Back & Biceps" value={wType} onChange={(e) => setWType(e.target.value)} required />
              <Input label="Duration (Minutes)" type="number" placeholder="45" value={wDuration} onChange={(e) => setWDuration(e.target.value)} required />
            </>
          )}

          {tab === "meal" && (
            <>
              <Input label="Meal Detail" placeholder="e.g. Grilled Chicken Salad" value={mName} onChange={(e) => setMName(e.target.value)} required />
              <Input label="Total Calories" type="number" placeholder="450" value={mCals} onChange={(e) => setMCals(e.target.value)} required />
            </>
          )}

          {tab === "steps" && (
            <>
              <Input label="Steps Walked" type="number" placeholder="2500" value={steps} onChange={(e) => setSteps(e.target.value)} required />
            </>
          )}

          <Button type="submit" isLoading={isLoading} className={`w-full h-12 mt-4 font-bold tracking-wide transition-all ${tab === 'water' ? 'bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/80' : tab === 'meal' ? 'bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/80' : tab === 'steps' ? 'bg-[var(--accent-amber)] hover:bg-[var(--accent-amber)]/80' : ''}`}>
             {tab === 'water' ? "Drink Water" : "Save Log to Health"}
          </Button>

        </form>
      </div>
    </BottomSheet>
  );
}
