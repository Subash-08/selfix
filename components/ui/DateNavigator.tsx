"use client";

import React, { useRef, useEffect } from "react";
import { format, subDays, addDays, isSameDay, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface DateNavigatorProps {
  selectedDate: Date;
  onChange: (date: Date) => void;
}

export function DateNavigator({ selectedDate, onChange }: DateNavigatorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const today = startOfDay(new Date());

  // Build the strip: 13 days back + today = 14 chips
  const days = Array.from({ length: 14 }, (_, i) => subDays(today, 13 - i));

  const scrollBy = (dir: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 280, behavior: "smooth" });
    }
  };

  // Scroll to selected date on mount
  useEffect(() => {
    if (scrollRef.current) {
      const selectedIdx = days.findIndex(d => isSameDay(d, selectedDate));
      if (selectedIdx >= 0) {
        const chipWidth = 56;
        const containerWidth = scrollRef.current.clientWidth;
        const scrollPos = selectedIdx * chipWidth - containerWidth / 2 + chipWidth / 2;
        scrollRef.current.scrollLeft = Math.max(0, scrollPos);
      }
    }
  }, []);

  return (
    <div className="flex items-center gap-2 w-full">
      <button
        onClick={() => scrollBy(-1)}
        className="shrink-0 w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors active:scale-95"
      >
        <ChevronLeft size={16} />
      </button>

      <div
        ref={scrollRef}
        className="flex-1 flex gap-1.5 overflow-x-auto scrollbar-hide py-1 scroll-smooth"
      >
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onChange(day)}
              className={`shrink-0 flex flex-col items-center justify-center w-[52px] h-[52px] rounded-xl text-center transition-all active:scale-95 ${
                isSelected
                  ? "bg-[var(--accent)] text-white shadow-md"
                  : isToday
                  ? "bg-[var(--bg-elevated)] border-2 border-[var(--accent)] text-[var(--text-primary)]"
                  : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
              }`}
            >
              <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
                {format(day, "EEE")}
              </span>
              <span className="text-base font-extrabold leading-none mt-0.5">
                {format(day, "d")}
              </span>
              {isToday && !isSelected && (
                <div className="w-1 h-1 rounded-full bg-[var(--accent)] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => scrollBy(1)}
        className="shrink-0 w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors active:scale-95"
      >
        <ChevronRight size={16} />
      </button>

      <button
        onClick={() => dateInputRef.current?.showPicker()}
        className="shrink-0 w-8 h-8 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors active:scale-95 relative"
      >
        <Calendar size={16} />
        <input
          ref={dateInputRef}
          type="date"
          value={format(selectedDate, "yyyy-MM-dd")}
          onChange={(e) => {
            if (e.target.value) onChange(startOfDay(new Date(e.target.value)));
          }}
          className="absolute inset-0 opacity-0 cursor-pointer"
          tabIndex={-1}
        />
      </button>
    </div>
  );
}
