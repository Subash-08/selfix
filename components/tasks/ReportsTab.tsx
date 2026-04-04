"use client";

import { useState } from "react";
import useSWR from "swr";
import { format, subDays } from "date-fns";
import { 
  Clock, Target, CheckCircle2, TrendingUp, Trophy, 
  AlertOctagon, AlertTriangle, ChevronDown, List, 
  Activity, Star, Frown, Calendar as CalendarIcon, LucideIcon
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function ReportsTab() {
  const [period, setPeriod] = useState<"today" | "7days" | "custom">("7days");
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));

  let start = format(new Date(), "yyyy-MM-dd");
  let end = format(new Date(), "yyyy-MM-dd");

  if (period === "7days") {
    start = format(subDays(new Date(), 6), "yyyy-MM-dd");
  } else if (period === "custom") {
    start = customStart;
    end = customEnd;
  }

  const { data: reportData, isLoading } = useSWR(`/api/tasks/reports?start=${start}&end=${end}`, fetcher);
  const data = reportData?.data;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse pt-4">
         <div className="h-10 bg-[var(--bg-elevated)] rounded-xl w-full"></div>
         <div className="grid grid-cols-2 gap-4">
           <div className="h-24 bg-[var(--bg-elevated)] rounded-2xl"></div>
           <div className="h-24 bg-[var(--bg-elevated)] rounded-2xl"></div>
           <div className="h-24 bg-[var(--bg-elevated)] rounded-2xl"></div>
           <div className="h-24 bg-[var(--bg-elevated)] rounded-2xl"></div>
         </div>
      </div>
    );
  }

  if (!data) return <div className="text-center p-8 font-bold text-[var(--text-muted)]">Failed to load reports.</div>;

  const topTasks = [...data.taskStats].sort((a,b) => b.successRate - a.successRate).slice(0, 3);
  const weakTasks = [...data.taskStats].filter(t => t.successRate < 50).sort((a,b) => a.successRate - b.successRate).slice(0, 3);

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ''}`;
    return `${m}m`;
  };

  const getCategoryIcon = (cat: string) => {
     switch (cat.toLowerCase()) {
       case 'work': return <Target size={16} className="text-blue-500" />;
       case 'health': return <Activity size={16} className="text-green-500" />;
       case 'personal': return <Star size={16} className="text-purple-500" />;
       default: return <List size={16} className="text-[var(--text-muted)]" />;
     }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300 pb-[100px]">
      {/* Date Filter */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 p-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)] overflow-x-auto scrollbar-hide">
          <button onClick={() => setPeriod("today")} className={`px-4 py-2 text-xs font-bold rounded-lg flex-1 ${period === 'today' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-secondary)]'}`}>Today</button>
          <button onClick={() => setPeriod("7days")} className={`px-4 py-2 text-xs font-bold rounded-lg flex-1 ${period === '7days' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-secondary)]'}`}>Last 7 Days</button>
          <button onClick={() => setPeriod("custom")} className={`px-4 py-2 text-xs font-bold rounded-lg flex-1 ${period === 'custom' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-secondary)]'}`}>Custom</button>
        </div>

        {period === "custom" && (
           <div className="flex gap-2">
              <input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)} className="flex-1 bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text-primary)]" />
              <input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} className="flex-1 bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border)] text-sm font-bold text-[var(--text-primary)]" />
           </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
         <KPICard icon={<Clock size={20} className="text-[var(--accent)]"/>} label="Total Logged" value={formatHours(data.totalTime)} />
         <KPICard icon={<Target size={20} className="text-green-500"/>} label="Completion" value={`${data.completionRate}%`} />
         <KPICard icon={<CheckCircle2 size={20} className="text-purple-500"/>} label="Tasks Done" value={`${data.tasksCompleted} / ${data.tasksTotal}`} />
         <KPICard icon={<TrendingUp size={20} className="text-orange-500"/>} label="Consistency" value={`${data.consistency}%`} subtext="Days > 70%" />
      </div>

      {/* Task Performance */}
      <div className="flex flex-col gap-3 mt-2">
         <h3 className="font-extrabold text-sm text-[var(--text-muted)] uppercase tracking-wider px-1 border-b border-[var(--border)] pb-2">Performance Focus</h3>
         
         {topTasks.length > 0 && (
           <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
             <div className="flex items-center gap-2 text-green-500 font-extrabold text-sm mb-1">
               <Trophy size={16} /> Top Performing
             </div>
             {topTasks.map((t, idx) => (
                <div key={idx} className="flex justify-between items-center bg-[var(--bg-elevated)] p-3 rounded-xl">
                  <span className="font-bold text-sm text-[var(--text-primary)]">{t.name}</span>
                  <span className="font-black text-green-500">{t.successRate}%</span>
                </div>
             ))}
           </div>
         )}

         {weakTasks.length > 0 && (
           <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-3 shadow-sm mt-1">
             <div className="flex items-center gap-2 text-[var(--accent-red)] font-extrabold text-sm mb-1">
               <AlertOctagon size={16} /> Needs Attention
             </div>
             {weakTasks.map((t, idx) => (
                <div key={idx} className="flex justify-between items-center bg-[var(--bg-elevated)] p-3 rounded-xl">
                  <span className="font-bold text-sm text-[var(--text-primary)]">{t.name}</span>
                  <span className="font-black text-[var(--accent-red)]">{t.successRate}%</span>
                </div>
             ))}
           </div>
         )}
      </div>

      {/* Violations */}
      {data.violations.length > 0 && (
        <div className="bg-[var(--accent-red)]/5 border border-[var(--accent-red)]/20 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
           <div className="flex items-center gap-2 text-[var(--accent-red)] font-extrabold text-sm">
             <AlertTriangle size={18} /> Limit Violations
           </div>
           {data.violations.map((v: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center bg-[var(--bg-card)]/80 p-3 rounded-xl border border-[var(--border)]">
                <span className="font-bold text-sm text-[var(--text-primary)]">{v.name}</span>
                <span className="font-black text-[var(--accent-red)] text-xs uppercase bg-[var(--accent-red)]/10 px-2 py-1 rounded">Exceeded {v.violations}x</span>
              </div>
           ))}
        </div>
      )}

      {/* Category Breakdown */}
      {data.categoryBreakdown.length > 0 && (
        <div className="flex flex-col gap-3 mt-2">
           <h3 className="font-extrabold text-sm text-[var(--text-muted)] uppercase tracking-wider px-1 border-b border-[var(--border)] pb-2">Category Distribution</h3>
           <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-4 shadow-sm">
             {data.categoryBreakdown.map((cat: any, idx: number) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-primary)]">
                       {getCategoryIcon(cat.name)} {cat.name}
                    </div>
                    <div className="flex gap-2 items-center text-xs font-bold text-[var(--text-muted)]">
                       <span>{formatHours(cat.time)}</span>
                       <span className="text-[var(--text-primary)] font-black w-8 text-right">{cat.percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-[var(--bg-elevated)] rounded-full h-2 overflow-hidden">
                    <div className="bg-[var(--accent)] h-full rounded-full transition-all duration-500" style={{ width: `${cat.percentage}%` }}></div>
                  </div>
                </div>
             ))}
           </div>
        </div>
      )}

      {/* Daily Summary */}
      {period !== "today" && (
        <div className="flex flex-col gap-3 mt-2">
           <h3 className="font-extrabold text-sm text-[var(--text-muted)] uppercase tracking-wider px-1 border-b border-[var(--border)] pb-2">Daily Summary</h3>
           <div className="grid grid-cols-2 gap-3">
             <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)]/50 text-center flex flex-col items-center gap-1">
                <Star size={20} className="text-yellow-500 mb-1" />
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Best Day</span>
                <span className="font-black text-[var(--text-primary)] text-sm">{data.bestDay.date !== '-' ? format(new Date(data.bestDay.date), 'MMM d') : '-'}</span>
                <span className="text-xs font-bold text-green-500">{data.bestDay.score}%</span>
             </div>
             <div className="bg-[var(--bg-elevated)] p-4 rounded-xl border border-[var(--border)]/50 text-center flex flex-col items-center gap-1">
                <Frown size={20} className="text-[var(--text-muted)] mb-1" />
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Worst Day</span>
                <span className="font-black text-[var(--text-primary)] text-sm">{data.worstDay.date !== '-' ? format(new Date(data.worstDay.date), 'MMM d') : '-'}</span>
                <span className="text-xs font-bold text-[var(--accent-red)]">{data.worstDay.score}%</span>
             </div>
           </div>
        </div>
      )}

    </div>
  );
}

function KPICard({ icon, label, value, subtext }: { icon: React.ReactNode, label: string, value: string, subtext?: string }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] p-4 rounded-2xl flex flex-col gap-1 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-2 opacity-80">
        <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="flex items-end justify-between">
         <span className="font-black text-xl text-[var(--text-primary)]">{value}</span>
         {subtext && <span className="text-[10px] font-bold text-[var(--text-muted)] pb-1">{subtext}</span>}
      </div>
    </div>
  );
}
