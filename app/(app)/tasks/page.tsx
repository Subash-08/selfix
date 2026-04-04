"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { format, subDays, addDays } from "date-fns";
import { DateNavigator } from "@/components/ui/DateNavigator";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useUIStore } from "@/store/uiStore";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TimeLogModal } from "@/components/tasks/TimeLogModal";
import { AddTaskSheet } from "@/components/tasks/AddTaskSheet";
import { EditTaskSheet } from "@/components/tasks/EditTaskSheet";
import { TodayAnalytics } from "@/components/tasks/TodayAnalytics";
import { SaveTemplateModal } from "@/components/tasks/SaveTemplateModal";
import { ApplyTemplateSheet } from "@/components/tasks/ApplyTemplateSheet";
import { ReportsTab } from "@/components/tasks/ReportsTab";
import { Copy, Plus, AlertTriangle, Target, BookmarkPlus } from "lucide-react";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function TasksPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tab, setTab] = useState<"today" | "schedule" | "reports">("today");
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [applyTemplateState, setApplyTemplateState] = useState<{isOpen: boolean, targetDate: string} | null>(null);
  
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data, error, isLoading, mutate } = useSWR(`/api/task-instances?date=${dateStr}`, fetcher);
  const { addToast } = useUIStore();

  const [logModalState, setLogModalState] = useState<{
    isOpen: boolean; taskId: string; taskName: string; logged: number; target: number | null, mode: "target-min" | "target-max", instanceId: string
  } | null>(null);

  const [editInstance, setEditInstance] = useState<any>(null);

  const scheduleStart = format(subDays(selectedDate, selectedDate.getDay() || 7 - 1), "yyyy-MM-dd");
  const scheduleEnd = format(addDays(selectedDate, 7 - (selectedDate.getDay() || 7)), "yyyy-MM-dd");
  const { data: scheduleData } = useSWR(tab === 'schedule' ? `/api/task-instances?start=${scheduleStart}&end=${scheduleEnd}` : null, fetcher);
  const weeklyInstances = scheduleData?.data || [];
  
  const rawInstances = data?.data || [];

  const instances = useMemo(() => {
    return [...rawInstances].sort((a: any, b: any) => {
      const pMap: any = { 'high': 3, 'medium': 2, 'low': 1 };
      const pA = pMap[a.priority || 'medium'] || 0;
      const pB = pMap[b.priority || 'medium'] || 0;
      if (pA !== pB) return pB - pA;
      return (b.targetDuration || 0) - (a.targetDuration || 0);
    });
  }, [rawInstances]);

  // Filter out soft-deleted instances
  const activeInstances = instances.filter((i: any) => !i.isDeleted);

  const totalDuration = activeInstances.reduce((acc: number, inst: any) => acc + (inst.targetDuration || 0), 0);
  const isOverloaded = totalDuration > 600; // > 10 hours

  const handleLogTime = (taskId: string, mins: number) => {
    const inst = activeInstances.find((i: any) => i._id === taskId);
    if (inst) {
      setLogModalState({
        isOpen: true,
        taskId: inst._id,
        taskName: inst.name,
        logged: inst.loggedTime,
        target: inst.targetDuration,
        mode: inst.mode,
        instanceId: inst._id
      });
    }
  };

  const handleSaveTime = async (newLoadedTime: number) => {
    if (!logModalState) return;
    try {
      const res = await fetch(`/api/task-instances/${logModalState.instanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loggedTime: newLoadedTime })
      });
      if (!res.ok) throw new Error("Update failed");
      await mutate();
    } catch {
      addToast({ message: "Update failed", type: "error" });
    }
  };

  const handleStateUpdate = async (instanceId: string, loggedTime: number) => {
    try {
      const res = await fetch(`/api/task-instances/${instanceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loggedTime })
      });
      if (!res.ok) throw new Error("Update failed");
      await mutate();
    } catch {
      addToast({ message: "Update failed", type: "error" });
    }
  };

  const copyYesterday = async (targetDStr: string = dateStr) => {
    const previousDateStr = format(subDays(new Date(targetDStr), 1), "yyyy-MM-dd");
    try {
      await fetch('/api/task-instances/copy-from-previous', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetDate: targetDStr, sourceDate: previousDateStr })
      });
      await mutate();
      addToast({ message: "Copied!", type: "success" });
    } catch {
      addToast({ message: "Copy failed", type: "error" });
    }
  };

  const displayedInstances = activeInstances;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full pb-24">
        <Skeleton height="52px" rounded="xl" />
        <Skeleton height="120px" rounded="2xl" />
        <Skeleton height="80px" rounded="2xl" />
        <Skeleton height="80px" rounded="2xl" />
        <Skeleton height="80px" rounded="2xl" />
      </div>
    );
  }

  const tabs = ["today", "schedule", "reports"] as const;

  return (
    <div className="flex flex-col gap-6 pb-24 animate-in fade-in duration-300">
      <DateNavigator selectedDate={selectedDate} onChange={setSelectedDate} />

      <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 items-center justify-between">
        <div className="flex gap-2">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-[11px] font-extrabold rounded-lg capitalize tracking-wider transition-colors whitespace-nowrap ${
                tab === t
                  ? "bg-[var(--accent)] text-white shadow-md"
                  : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAddSheet(true)} className="p-2 rounded-full bg-[var(--accent)] text-white shadow-md">
          <Plus size={16} strokeWidth={3} />
        </button>
      </div>

      {tab === "today" && (
        <div className="flex flex-col gap-3">
          {activeInstances.length > 0 && <TodayAnalytics instances={activeInstances} />}

          {isOverloaded && (
            <div className="flex items-center gap-2 p-3 bg-[var(--accent-red)]/10 text-[var(--accent-red)] rounded-xl text-xs font-bold mb-2 mt-2">
               <AlertTriangle size={16} /> You planned {Math.floor(totalDuration/60)}h — unrealistic? Consider scoping down.
            </div>
          )}

          {activeInstances.length > 0 && (
            <div className="flex items-center justify-between mt-2 px-1">
              <h3 className="font-extrabold text-sm text-[var(--text-muted)] uppercase tracking-wider">Your Day</h3>
            </div>
          )}

          {activeInstances.length === 0 ? (
            <div className="flex flex-col flex-1 items-center justify-center p-10 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border)] border-dashed gap-6">
               <div className="text-center">
                 <p className="text-[var(--text-primary)] font-extrabold text-lg">Start Your Day</p>
                 <p className="text-[var(--text-muted)] font-bold text-sm mt-1">Apply a template or continue yesterday.</p>
               </div>
               <div className="flex flex-col w-full gap-3">
                 <button onClick={() => setApplyTemplateState({ isOpen: true, targetDate: dateStr })} className="flex items-center justify-center w-full gap-2 px-4 py-4 bg-[var(--accent)] text-white rounded-xl font-black shadow-sm active:scale-95 transition-all text-sm">
                   Apply Template
                 </button>
                 <button onClick={() => copyYesterday(dateStr)} className="flex items-center justify-center w-full gap-2 px-4 py-3 bg-[var(--bg-card)] rounded-xl font-bold shadow-sm border border-[var(--border)] active:scale-95 transition-all text-sm">
                   <Copy size={16} /> Copy Yesterday
                 </button>
                 <button onClick={() => setShowAddSheet(true)} className="flex items-center justify-center w-full gap-2 px-4 py-3 bg-[var(--bg-card)] rounded-xl font-bold border border-[var(--border)] shadow-sm active:scale-95 transition-all text-sm">
                   <Plus size={16} /> Create Custom Task
                 </button>
               </div>
            </div>
          ) : (
             <>
                {displayedInstances.map((inst: any) => (
                  <TaskCard 
                    key={inst._id} 
                    instance={inst} 
                    onLogTime={handleLogTime}
                    onStateUpdate={handleStateUpdate}
                    onEdit={setEditInstance}
                    onDelete={async (id) => await mutate()}
                  />
                ))}
                
                <button 
                  onClick={() => setShowSaveTemplate(true)}
                  className="mt-6 flex items-center justify-center gap-2 p-4 border border-[var(--accent)]/30 text-[var(--accent)] bg-[var(--accent)]/5 rounded-2xl font-bold hover:bg-[var(--accent)]/10 transition-colors"
                >
                  <BookmarkPlus size={18} /> Save Day as Template
                </button>
             </>
          )}
        </div>
      )}

      {tab === "schedule" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Weekly Planner</h2>
          </div>
          <div className="flex flex-col gap-3">
            {[0,1,2,3,4,5,6].map(i => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - (d.getDay() === 0 ? 7 : d.getDay()) + 1 + i); // Mon-Sun
              const dStr = format(d, "yyyy-MM-dd");
              const isToday = dStr === dateStr;
              
              const dayInstances = weeklyInstances.filter((inst: any) => inst.date === dStr);
              const templateNames = [...new Set(dayInstances.map((inst: any) => inst.templateName).filter(Boolean))];
              const templateLabel = templateNames.length > 0 ? templateNames.join(', ') : (dayInstances.length > 0 ? 'Custom' : 'Empty');

              return (
                <div key={i} className={`flex flex-col gap-3 p-4 border rounded-2xl ${isToday ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] bg-[var(--bg-elevated)]'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                       <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest">{format(d, "EEEE")}</span>
                       <span className={`text-base font-extrabold ${isToday ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>{format(d, "MMM d")}</span>
                       {dayInstances.length > 0 && (
                         <div className="flex items-center gap-2 mt-1">
                           <span className="text-[10px] bg-[var(--bg-card)] border px-1.5 py-0.5 rounded text-[var(--text-muted)]">{dayInstances.length} Tasks</span>
                           <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[100px]">{templateLabel}</span>
                         </div>
                       )}
                    </div>
                    <button onClick={() => { setSelectedDate(d); setTab('today'); }} className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-xs font-bold shadow-sm active:scale-95 text-[var(--text-primary)]">Edit Day</button>
                  </div>
                  
                  <div className="flex gap-2">
                    <button onClick={() => setApplyTemplateState({isOpen: true, targetDate: dStr})} className="flex-1 py-3 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 rounded-xl text-xs font-bold shadow-sm active:scale-95">Apply Template</button>
                     <button onClick={() => copyYesterday(dStr)} className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-xs font-bold shadow-sm active:scale-95 flex items-center gap-1"><Copy size={12}/> Copy Prev</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "reports" && (
        <ReportsTab />
      )}

      <AddTaskSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} dateStr={dateStr} />
      <SaveTemplateModal isOpen={showSaveTemplate} onClose={() => setShowSaveTemplate(false)} dateStr={dateStr} />
      <ApplyTemplateSheet isOpen={applyTemplateState?.isOpen || false} onClose={() => setApplyTemplateState(null)} targetDate={applyTemplateState?.targetDate || dateStr} />
      <EditTaskSheet isOpen={!!editInstance} onClose={() => setEditInstance(null)} dateStr={dateStr} instance={editInstance} />

      {logModalState && (
        <TimeLogModal
          isOpen={logModalState.isOpen}
          onClose={() => setLogModalState(null)}
          taskName={logModalState.taskName}
          currentLogged={logModalState.logged}
          targetDuration={logModalState.target}
          mode={logModalState.mode}
          onSave={handleSaveTime}
        />
      )}
    </div>
  );
}
