"use client";

import { useState } from "react";
import useSWR from "swr";
import { Target, Sparkles, Brain, Plus, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { GOAL_TEMPLATES } from "@/lib/constants";
import { useUIStore } from "@/store/uiStore";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function GoalsPage() {
  const { data, isLoading, mutate } = useSWR("/api/goals", fetcher);
  const { activeSheet, closeSheet, addToast, openSheet } = useUIStore();

  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  // New goal form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("personal");
  const [creating, setCreating] = useState(false);

  const goals = data?.data || [];
  const activeGoals = goals.filter((g: any) => g.status === "active");
  const completedGoals = goals.filter((g: any) => g.status === "completed");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return addToast({ message: "Title required", type: "error" });
    setCreating(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      addToast({ message: "Goal created!", type: "success" });
      setTitle(""); setDescription("");
      closeSheet();
      mutate();
    } catch (e: any) { addToast({ message: e.message, type: "error" }); }
    finally { setCreating(false); }
  };

  const handleCreateFromTemplate = async (tmpl: any) => {
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: tmpl.title,
          description: tmpl.description,
          category: tmpl.category || "personal",
          milestones: tmpl.milestones.map((m: any) => ({ title: typeof m === "string" ? m : m.title, completed: false, order: m.order || 0 })),
        }),
      });
      if (res.ok) {
        addToast({ message: `"${tmpl.title}" goal created!`, type: "success" });
        setShowTemplates(false);
        mutate();
      }
    } catch { addToast({ message: "Failed", type: "error" }); }
  };

  const handleToggleMilestone = async (goalId: string, milestones: any[], index: number) => {
    const updated = milestones.map((m: any, i: number) => i === index ? { ...m, completed: !m.completed } : m);
    try {
      await fetch(`/api/goals/${goalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestones: updated }),
      });
      mutate();
    } catch { addToast({ message: "Failed to update", type: "error" }); }
  };

  const handleAISuggest = async () => {
    setIsSuggesting(true);
    try {
      const res = await fetch("/api/goals/ai-suggest");
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setAiSuggestions(d.data || []);
      addToast({ message: "AI suggestions ready!", type: "success" });
    } catch (e: any) { addToast({ message: e.message, type: "error" }); }
    finally { setIsSuggesting(false); }
  };

  const absorbGoal = async (g: any) => {
    try {
      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...g,
          aiSuggested: true,
          milestones: g.milestones?.map((m: any, i: number) => ({ title: typeof m === "string" ? m : m.title, completed: false, order: i })),
        }),
      });
      setAiSuggestions(prev => prev.filter(s => s.title !== g.title));
      mutate();
      addToast({ message: "Goal added!", type: "success" });
    } catch { addToast({ message: "Failed", type: "error" }); }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full pb-24">
        <Skeleton height="100px" rounded="2xl" />
        <Skeleton height="100px" rounded="2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-24 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Target size={18} className="text-[var(--accent)]" /> Goals
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setShowTemplates(!showTemplates)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)] transition-colors hover:text-[var(--text-primary)]">
            📋 Templates
          </button>
          <button onClick={handleAISuggest} disabled={isSuggesting}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-500/10 text-purple-400 transition-colors hover:bg-purple-500/20">
            {isSuggesting ? <Brain size={14} className="animate-pulse" /> : <Sparkles size={14} />}
          </button>
        </div>
      </div>

      {/* Templates */}
      {showTemplates && (
        <div className="flex flex-col gap-2 p-4 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl animate-in slide-in-from-top-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Goal Templates</h3>
          {GOAL_TEMPLATES.map(t => (
            <Card key={t.id} className="flex justify-between items-center p-3">
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">{t.title}</h4>
                <p className="text-xs text-[var(--text-muted)]">{t.description}</p>
              </div>
              <button onClick={() => handleCreateFromTemplate(t)} className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center">
                <Plus size={14} />
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="flex flex-col gap-2 p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl animate-in fade-in">
          <h3 className="text-xs font-bold uppercase tracking-widest text-purple-400 flex items-center gap-1"><Sparkles size={12} /> AI Suggestions</h3>
          {aiSuggestions.map((sg, i) => (
            <Card key={i} className="flex justify-between items-start p-3 border-purple-500/10">
              <div className="pr-3">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">{sg.title}</h4>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{sg.description}</p>
              </div>
              <button onClick={() => absorbGoal(sg)} className="shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center">
                <Plus size={14} />
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* Active Goals */}
      {activeGoals.length === 0 ? (
        <EmptyState title="No active goals" subtitle="Create a goal or use templates to get started." />
      ) : (
        activeGoals.map((goal: any) => {
          const ms = goal.milestones || [];
          const completedMs = ms.filter((m: any) => m.completed).length;
          const progressPct = ms.length > 0 ? Math.round((completedMs / ms.length) * 100) : 0;
          const isExpanded = expandedGoal === goal._id;

          return (
            <Card key={goal._id} className="flex flex-col p-4 transition-all">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedGoal(isExpanded ? null : goal._id)}>
                <ProgressRing value={progressPct} size={50} strokeWidth={5} color="var(--accent)">
                  <span className="text-[10px] font-extrabold text-[var(--text-primary)]">{progressPct}%</span>
                </ProgressRing>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{goal.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)]">{goal.category}</span>
                    {goal.aiSuggested && <Sparkles size={10} className="text-purple-400" />}
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
              </div>

              {isExpanded && (
                <div className="flex flex-col gap-3 mt-4 pt-3 border-t border-[var(--border)] animate-in fade-in slide-in-from-top-2">
                  {goal.description && <p className="text-sm text-[var(--text-secondary)]">{goal.description}</p>}
                  {ms.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {ms.map((m: any, i: number) => (
                        <button key={i} onClick={() => handleToggleMilestone(goal._id, ms, i)}
                          className="flex items-center gap-2.5 text-left group">
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${m.completed ? "bg-[var(--accent-green)] border-[var(--accent-green)] text-white" : "border-[var(--border-hover)] group-hover:border-[var(--accent)]"}`}>
                            {m.completed && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span className={`text-sm ${m.completed ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}>{m.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">Completed</h2>
          {completedGoals.map((g: any) => (
            <Card key={g._id} className="p-3 opacity-60">
              <h4 className="text-sm font-bold text-[var(--text-primary)] line-through">{g.title}</h4>
            </Card>
          ))}
        </section>
      )}

      {/* Add Goal Sheet */}
      <BottomSheet isOpen={activeSheet === "goal"} onClose={closeSheet}>
        <div className="flex flex-col gap-5 pb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">New Goal</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Input label="Goal Title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Run a marathon" required />
            <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Why this matters..." />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none">
                <option value="personal">Personal</option>
                <option value="finance">Finance</option>
                <option value="health">Health</option>
                <option value="career">Career</option>
                <option value="learning">Learning</option>
              </select>
            </div>
            <Button type="submit" isLoading={creating} className="w-full">Create Goal</Button>
          </form>
        </div>
      </BottomSheet>
    </div>
  );
}
