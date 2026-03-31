import React from "react";

export function StreakBadge({ count }: { count: number }) {
  const isActive = count > 0;
  return (
    <div 
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full font-bold text-sm bg-[var(--bg-card)] border border-[var(--border)] transition-shadow ${isActive ? 'text-[var(--accent-amber)] shadow-[0_0_8px_var(--accent-amber)]' : 'text-[var(--text-muted)]'}`}
    >
      <span>🔥</span>
      <span>{count}</span>
    </div>
  );
}
