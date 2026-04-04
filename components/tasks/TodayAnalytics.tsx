export function TodayAnalytics({ instances }: { instances: any[] }) {
  const totalTasks = instances.length;
  let completed = 0;
  let targetTotal = 0;
  let loggedTotal = 0;
  let overachieved = 0;
  let violations = 0;

  instances.forEach(inst => {
    if (inst.status === 'completed') completed++;
    
    // Time tracking Math
    if (inst.targetDuration > 0) {
      targetTotal += inst.targetDuration;
      loggedTotal += inst.loggedTime;
    }

    if (inst.mode === 'target-min' && inst.loggedTime > inst.targetDuration && inst.targetDuration > 0) {
      overachieved++;
    }

    if (inst.mode === 'target-max' && inst.loggedTime > inst.targetDuration && inst.targetDuration > 0) {
      violations++;
    }
  });

  const completionPercent = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 mb-2">
      <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] shadow-sm flex flex-col justify-between">
         <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Completion</span>
         <div className="flex items-end gap-2 mt-2">
            <span className="text-3xl font-black">{completionPercent}%</span>
            <span className="text-sm font-bold text-[var(--text-muted)] mb-1">{completed}/{totalTasks} tasks</span>
         </div>
      </div>

      <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] shadow-sm flex flex-col justify-between">
         <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Time Tracked</span>
         <div className="flex items-end gap-2 mt-2">
            <span className="text-3xl font-black">{Math.floor(loggedTotal / 60)}h {loggedTotal % 60}m</span>
         </div>
      </div>

      <div className="col-span-2 flex gap-2">
        {overachieved > 0 && (
           <div className="flex-1 py-2 px-3 bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/20 rounded-lg text-center gap-1 flex items-center justify-center">
              <span className="text-[var(--accent-green)] font-extrabold text-sm text-center">🔥 {overachieved} Overachieved!</span>
           </div>
        )}
        {violations > 0 && (
           <div className="flex-1 py-2 px-3 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 rounded-lg text-center gap-1 flex items-center justify-center">
              <span className="text-[var(--accent-red)] font-extrabold text-sm text-center">❌ {violations} Violations</span>
           </div>
        )}
      </div>
    </div>
  );
}
