"use client";

import { useState, useEffect } from "react";
import { useSWRConfig } from "swr";
import { X, Play, Pause, RotateCcw, FastForward } from "lucide-react";
import { useUIStore } from "@/store/uiStore";

export function FocusTimer({ onComplete }: { onComplete: () => void }) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 mins Focus Timer
  const [isActive, setIsActive] = useState(false);
  const { addToast } = useUIStore();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    let interval: any;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      handleSessionComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleSessionComplete = async () => {
    try {
      await fetch("/api/activities/pomodoro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: 25 })
      });
      addToast({ message: "Focus Session complete! +1 Pomodoro logged.", type: "success" });
      mutate('/api/activities');
    } catch (e) {
      addToast({ message: "Failed to save session", type: "error" });
    } finally {
      onComplete(); // back to dashboard
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  // Progress Ring Mapping
  const FULL_DASH_ARRAY = 283;
  const rawTimeFraction = timeLeft / (25 * 60);
  const dasharray = `${(rawTimeFraction * FULL_DASH_ARRAY).toFixed(0)} 283`;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
      
      <button 
        onClick={onComplete}
        className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-full hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-all active:scale-95"
      >
        <X size={24} strokeWidth={2.5} />
      </button>

      <h2 className="text-sm font-extrabold text-[var(--accent)] tracking-[0.3em] uppercase mb-16 px-4 py-1.5 bg-[var(--accent)]/10 rounded-full shadow-sm">
        Deep Work
      </h2>

      {/* Hero Timer Math Engine */}
      <div className="relative w-[320px] h-[320px] flex items-center justify-center mb-16">
        <svg className="absolute inset-0 w-full h-full transform -rotate-90 drop-shadow-2xl" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--bg-elevated)" strokeWidth="3" />
          <circle 
            cx="50" 
            cy="50" 
            r="45" 
            fill="none" 
            stroke="var(--accent)" 
            strokeWidth="3.5" 
            strokeLinecap="round"
            strokeDasharray={dasharray}
            className="transition-all duration-1000 ease-linear shadow-[0_0_20px_rgba(var(--accent-rgb),0.5)] glow"
          />
        </svg>
        <span className="text-[5.5rem] font-black font-mono tracking-tighter text-[var(--text-primary)] drop-shadow-md">
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>

      {/* Control Matrices */}
      <div className="flex items-center gap-8">
        <button 
          onClick={() => {
            setTimeLeft(25 * 60);
            setIsActive(false);
          }}
          className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] outline outline-1 outline-[var(--border)] text-[var(--text-secondary)] flex items-center justify-center hover:bg-[var(--border-hover)] transition-colors active:scale-90"
        >
          <RotateCcw size={26} />
        </button>
        
        <button 
          onClick={() => setIsActive(!isActive)}
          className="w-24 h-24 rounded-[2rem] bg-[var(--accent)] text-white shadow-[0_10px_40px_rgba(var(--accent-rgb),0.4)] flex items-center justify-center active:scale-90 transition-all hover:scale-105"
        >
          {isActive ? <Pause size={40} className="fill-white" /> : <Play size={40} className="ml-2 fill-white" />}
        </button>

        {/* Development fast forward helper to avoid waiting literally 25 minutes */}
        <button 
           onClick={() => {
             setTimeLeft(3); // Drops timer to 3 seconds gracefully resolving into next phase API
             setIsActive(true);
           }}
           className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] outline outline-1 outline-[var(--border)] text-[var(--accent-amber)] flex items-center justify-center hover:bg-[var(--border-hover)] transition-colors active:scale-90 cursor-help"
           title="Fast-forward dev toggle (drops timer to 3s)"
        >
          <FastForward size={26} />
        </button>
      </div>

    </div>
  );
}
