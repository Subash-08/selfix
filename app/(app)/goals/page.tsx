"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { format, parseISO, addDays, subDays, startOfWeek } from "date-fns";
import { Plus, Check, Trash2, CalendarDays } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { useUIStore } from "@/store/uiStore";

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface Task {
  _id: string;
  title: string;
  date: string;       // "YYYY-MM-DD"
  completed: boolean;
  order: number;
  createdAt: string;
}

export default function TasksPage() {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");

  const [view, setView] = useState<"today" | "week" | "date">("today");
  const [pickedDate, setPickedDate] = useState<string>(todayStr);
  const [title, setTitle] = useState("");
  const [taskDate, setTaskDate] = useState(todayStr);
  const [saving, setSaving] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [undoTask, setUndoTask] = useState<Task | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [dismissedCarryForward, setDismissedCarryForward] = useState(false);

  const { activeSheet, closeSheet, addToast, openSheet } = useUIStore();

  const activeDate = view === "date" ? pickedDate : todayStr;
  const { data: dayData, isLoading: dayLoading, mutate: mutateDay } =
    useSWR(view !== "week" ? `/api/tasks?date=${activeDate}` : null, fetcher);

  const mondayOfWeek = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const { data: weekData, isLoading: weekLoading, mutate: mutateWeek } =
    useSWR(view === "week" ? `/api/tasks?week=${mondayOfWeek}` : null, fetcher);

  const { data: yesterdayData, mutate: mutateYesterday } =
    useSWR(`/api/tasks?date=${yesterdayStr}`, fetcher);

  const tasks: Task[] = dayData?.data || [];
  const weekTasks: { [date: string]: Task[] } = weekData?.data || {};
  const yesterdayTasks: Task[] = (yesterdayData?.data || []).filter((t: Task) => !t.completed);

  const mutate = () => {
    if (mutateDay) mutateDay();
    if (mutateWeek) mutateWeek();
  };

  // Helper functions
  function formatDayLabel(dateStr: string): string {
    return format(parseISO(dateStr), "EEE, MMM d");
  }

  function isToday(dateStr: string): boolean {
    return dateStr === todayStr;
  }

  function getWeekDays(): string[] {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) =>
      format(addDays(monday, i), "yyyy-MM-dd")
    );
  }

  // Handlers
  const handleToggleComplete = async (task: Task) => {
    try {
      await fetch(`/api/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed }),
      });
      mutate();
    } catch {
      addToast({ message: "Failed to update task", type: "error" });
    }
  };

  const handleUndo = async () => {
    if (!undoTask) return;
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: undoTask.title,
          date: undoTask.date,
          order: undoTask.order
        }),
      });
      mutate();
      setUndoTask(null);
      if (undoTimer) clearTimeout(undoTimer);
      addToast({ message: "Task restored!", type: "success" });
    } catch {
      addToast({ message: "Failed to restore task", type: "error" });
    }
  };

  const handleDelete = async (task: Task) => {
    try {
      await fetch(`/api/tasks/${task._id}`, { method: "DELETE" });
      mutate();
      setUndoTask(task);
      if (undoTimer) clearTimeout(undoTimer);
      
      // If we could add actions to toasts we would do it here, but store currently expects simple type
      // Our custom uiStore Toast type does not have action so we just show info
      addToast({ message: `"${task.title}" deleted`, type: "info" });
      
      const timer = setTimeout(() => setUndoTask(null), 3000);
      setUndoTimer(timer);
    } catch {
      addToast({ message: "Failed to delete task", type: "error" });
    }
  };

  const handleCarryForward = async () => {
    try {
      await fetch("/api/tasks/carry-forward", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: yesterdayTasks.map(t => t._id),
          date: todayStr
        }),
      });
      mutate();
      if (mutateYesterday) mutateYesterday();
      setDismissedCarryForward(true);
      addToast({ message: "Tasks moved to today!", type: "success" });
    } catch {
      addToast({ message: "Failed to move tasks", type: "error" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return addToast({ message: "Task title required", type: "error" });
    setSaving(true);
    try {
      if (editingTask) {
        await fetch(`/api/tasks/${editingTask._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), date: taskDate }),
        });
        
        if (editingTask.date !== taskDate) {
          addToast({ message: `Task moved to ${formatDayLabel(taskDate)}`, type: "success" });
        } else {
          addToast({ message: "Task updated!", type: "success" });
        }
      } else {
        const existingForDate = view === "week"
          ? (weekTasks[taskDate] || [])
          : tasks.filter(t => t.date === taskDate);
        const maxOrder = existingForDate.length > 0
          ? Math.max(...existingForDate.map(t => t.order)) + 1
          : 0;

        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), date: taskDate, order: maxOrder }),
        });
        addToast({ message: "Task added!", type: "success" });
      }
      setTitle("");
      setEditingTask(null);
      closeSheet();
      mutate();
    } catch {
      addToast({ message: "Failed to save task", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const renderTaskList = (taskList: Task[], explicitDateIfEmpty?: string) => {
    if (taskList.length === 0) {
      if (view === "week") {
        return <div className="text-xs text-[var(--text-muted)] py-1 pl-1">Nothing planned</div>;
      }
      return (
        <EmptyState
          title={`Nothing planned for ${explicitDateIfEmpty === todayStr ? 'today' : (explicitDateIfEmpty ? formatDayLabel(explicitDateIfEmpty) : 'today')}`}
          subtitle="Tap + to add your first task"
        />
      );
    }

    const incomplete = taskList.filter(t => !t.completed).sort((a, b) => a.order - b.order);
    const completed = taskList.filter(t => t.completed).sort((a, b) => a.order - b.order);

    return (
      <div className="flex flex-col gap-3">
        {incomplete.map(task => (
          <Card key={task._id} className="flex items-center gap-3 p-4 transition-all">
            <button
              onClick={() => handleToggleComplete(task)}
              className="shrink-0 w-6 h-6 rounded-md border-2 border-[var(--border-hover)] hover:border-[var(--accent)] flex items-center justify-center transition-colors"
            >
              {/* Check hidden for incomplete */}
            </button>
            <span
              onClick={() => {
                setEditingTask(task);
                setTitle(task.title);
                setTaskDate(task.date);
                openSheet("task");
              }}
              className="flex-1 text-sm font-bold text-[var(--text-primary)] cursor-pointer"
            >
              {task.title}
            </span>
            <button
              onClick={() => handleDelete(task)}
              className="shrink-0 text-[var(--text-muted)] hover:text-red-400 p-1"
            >
              <Trash2 size={15} />
            </button>
          </Card>
        ))}

        {completed.map(task => (
          <Card key={task._id} className="flex items-center gap-3 p-4 opacity-50 transition-all">
            <button
              onClick={() => handleToggleComplete(task)}
              className="shrink-0 w-6 h-6 rounded-md border-2 bg-[var(--accent-green)] border-[var(--accent-green)] flex items-center justify-center transition-colors"
            >
              <Check size={14} strokeWidth={3} className="text-white" />
            </button>
            <span
              onClick={() => {
                setEditingTask(task);
                setTitle(task.title);
                setTaskDate(task.date);
                openSheet("task");
              }}
              className="flex-1 text-sm font-bold line-through text-[var(--text-primary)] cursor-pointer"
            >
              {task.title}
            </span>
            <button
              onClick={() => handleDelete(task)}
              className="shrink-0 text-[var(--text-muted)] hover:text-red-400 p-1"
            >
              <Trash2 size={15} />
            </button>
          </Card>
        ))}
      </div>
    );
  };

  const isLoading = view === "week" ? weekLoading : dayLoading;
  
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 w-full pb-24">
        <Skeleton height="44px" rounded="xl" />
        <Skeleton height="80px" rounded="2xl" />
        <Skeleton height="60px" rounded="2xl" />
        <Skeleton height="60px" rounded="2xl" />
        <Skeleton height="60px" rounded="2xl" />
      </div>
    );
  }

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="flex flex-col gap-6 pb-24 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          ☑️ Tasks
        </h1>
        <button
          onClick={() => {
            setTitle("");
            setTaskDate(view === "date" ? pickedDate : todayStr);
            setEditingTask(null);
            openSheet("task");
          }}
          className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 p-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl">
          {(["today", "week", "date"] as const).map(v => (
            <button
              key={v}
              onClick={() => {
                setView(v);
                if (v === "date" && !pickedDate) setPickedDate(todayStr);
              }}
              className={`flex-1 py-2 px-3 text-[13px] font-bold rounded-lg transition-colors ${
                view === v
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {v === "today" && "Today"}
              {v === "week" && "This Week"}
              {v === "date" && "Pick Date 📅"}
            </button>
          ))}
        </div>
        
        {view === "date" && (
          <input
            type="date"
            value={pickedDate}
            onChange={e => setPickedDate(e.target.value)}
            max={format(addDays(new Date(), 365), "yyyy-MM-dd")}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
          />
        )}
      </div>

      {view === "today" && yesterdayTasks.length > 0 && !dismissedCarryForward && (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl p-3 flex items-center justify-between animate-in slide-in-from-top-2">
          <span className="text-sm text-[var(--text-secondary)] flex items-center gap-1.5">
            ↩ <span className="font-bold text-[var(--text-primary)]">{yesterdayTasks.length}</span> incomplete tasks from yesterday
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDismissedCarryForward(true)}
              className="px-2 py-1 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Dismiss
            </button>
            <button
              onClick={handleCarryForward}
              className="px-3 py-1.5 text-xs font-bold bg-[var(--accent)] text-white rounded-lg"
            >
              Move to Today
            </button>
          </div>
        </div>
      )}

      {view === "today" && tasks.length > 0 && (
        <Card className="flex items-center justify-between p-5">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Today</span>
            <span className="text-2xl font-black text-[var(--text-primary)]">
              {completedCount === tasks.length ? "🎉 All done!" : `${completedCount} / ${tasks.length} done`}
            </span>
          </div>
          <ProgressRing 
            size={52} 
            strokeWidth={5} 
            color="var(--accent)"
            value={tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}
          >
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%
            </span>
          </ProgressRing>
        </Card>
      )}

      {view === "today" && renderTaskList(tasks, todayStr)}

      {view === "date" && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 pl-1">
            {formatDayLabel(pickedDate)}
            {isToday(pickedDate) && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-[var(--accent)]/10 text-[var(--accent)] uppercase tracking-wider">
                Today
              </span>
            )}
          </h2>
          {renderTaskList(tasks, pickedDate)}
        </div>
      )}

      {view === "week" && (
        <div className="flex flex-col gap-6">
          {(() => {
            const allWeekTasks = Object.values(weekTasks).flat();
            const doneCount = allWeekTasks.filter(t => t.completed).length;
            const totalCount = allWeekTasks.length;
            const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
            
            return (
              <div className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest pl-1">
                This week: {doneCount} / {totalCount} tasks done {totalCount > 0 && `(${pct}%)`}
              </div>
            );
          })()}

          {getWeekDays().map(dateStr => {
            const dayTasks = weekTasks[dateStr] || [];
            const done = dayTasks.filter(t => t.completed).length;
            const total = dayTasks.length;
            const isTodaySec = isToday(dateStr);

            return (
              <div 
                key={dateStr}
                className={isTodaySec ? "border border-[var(--accent)]/20 rounded-2xl p-3 bg-[var(--accent)]/5" : ""}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] pl-1">{formatDayLabel(dateStr)}</h3>
                    {isTodaySec && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-[var(--accent)]/10 text-[var(--accent)] uppercase tracking-wider">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-[var(--text-muted)]">
                      {done}/{total}
                    </span>
                    <button
                      onClick={() => {
                        setTitle("");
                        setTaskDate(dateStr);
                        setEditingTask(null);
                        openSheet("task");
                      }}
                      className="w-6 h-6 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-secondary)] transition-all"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
                {renderTaskList(dayTasks)}
              </div>
            );
          })}
        </div>
      )}

      {undoTask && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-4 py-2.5 rounded-full text-sm font-bold flex items-center gap-3 shadow-lg z-50 animate-in slide-in-from-bottom-4">
          <span>Task deleted</span>
          <button onClick={handleUndo} className="text-[var(--accent)] hover:underline">Undo</button>
        </div>
      )}

      {/* Add / Edit Goal (Task) Sheet */}
      <BottomSheet isOpen={activeSheet === "task"} onClose={() => {
        closeSheet();
        setEditingTask(null);
        setTitle("");
      }}>
        <div className="flex flex-col gap-5 pb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {editingTask ? "Edit Task" : "New Task"}
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input 
              label="Task" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. Review budget spreadsheet" 
              required 
              autoFocus 
            />
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                Date
              </label>
              <input
                type="date"
                value={taskDate}
                onChange={e => setTaskDate(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
              
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setTaskDate(todayStr)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${
                    taskDate === todayStr
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)]"
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setTaskDate(format(addDays(new Date(), 1), "yyyy-MM-dd"))}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${
                    taskDate === format(addDays(new Date(), 1), "yyyy-MM-dd")
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)]"
                  }`}
                >
                  Tomorrow
                </button>
                {(() => {
                  const mndyStr = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
                  const currentIsPastMonday = mndyStr < todayStr;
                  const targetMondayStr = currentIsPastMonday
                    ? format(addDays(parseISO(mndyStr), 7), "yyyy-MM-dd")
                    : mndyStr;
                  
                  if (todayStr === targetMondayStr) return null; // already today
                  
                  return (
                    <button
                      type="button"
                      onClick={() => setTaskDate(targetMondayStr)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors ${
                        taskDate === targetMondayStr
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {currentIsPastMonday ? "Next Monday" : "This Monday"}
                    </button>
                  );
                })()}
              </div>
            </div>

            <Button type="submit" isLoading={saving} className="w-full mt-2">
              {editingTask ? "Save Changes" : "Add Task"}
            </Button>
          </form>
        </div>
      </BottomSheet>
    </div>
  );
}
