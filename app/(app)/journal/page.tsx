"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { BookOpen, Wand2, Search, PenLine, RefreshCw, FileText, Lightbulb, Sparkles, Brain, Plus, ChevronLeft, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { DateNavigator } from "@/components/ui/DateNavigator";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { MOOD_OPTIONS } from "@/lib/constants";
import { useUIStore } from "@/store/uiStore";

const fetcher = (url: string) => fetch(url).then(r => r.json());

const TONES = ["reflective", "motivational", "analytical", "concise", "storytelling"] as const;

const AI_MODES = [
  { id: "expand", label: "Expand", icon: PenLine, desc: "Detailed version" },
  { id: "rewrite", label: "Rewrite", icon: Sparkles, desc: "Clean version" },
  { id: "summarize", label: "Summarize", icon: FileText, desc: "Short version" },
  { id: "insights", label: "Insights", icon: Brain, desc: "Analysis" },
] as const;

export default function JournalPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data, isLoading, mutate } = useSWR(`/api/journal?date=${dateStr}`, fetcher);
  const { activeSheet, closeSheet, addToast, openSheet } = useUIStore();

  const entries: any[] = data?.data || [];

  // View state: "list" shows all entries, "editor" shows the editor
  const [view, setView] = useState<"list" | "editor">("list");

  // Editor state
  const [mood, setMood] = useState(3);
  const [rawNotes, setRawNotes] = useState("");
  const [wentWell, setWentWell] = useState("");
  const [drained, setDrained] = useState("");
  const [tomorrow, setTomorrow] = useState("");
  const [gratitude, setGratitude] = useState(["", "", ""]);
  const [expandedContent, setExpandedContent] = useState("");
  const [isExpanding, setIsExpanding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // AI control state
  const [tone, setTone] = useState<string>("reflective");
  const [lastMode, setLastMode] = useState<string>("expand");
  const [aiCooldown, setAiCooldown] = useState(false);
  const [insights, setInsights] = useState<{ mood: string; patterns: string; suggestions: string } | null>(null);

  // Reset editor to blank state for a new entry
  const resetEditor = () => {
    setMood(3);
    setRawNotes("");
    setExpandedContent("");
    setGratitude(["", "", ""]);
    setWentWell("");
    setDrained("");
    setTomorrow("");
    setEditingId(null);
    setInsights(null);
  };

  // Open editor with existing entry data
  const openEntry = (entry: any) => {
    setMood(entry.mood || 3);
    setRawNotes(entry.rawNotes || "");
    setExpandedContent(entry.expandedContent || "");
    setGratitude(entry.gratitude?.length ? entry.gratitude : ["", "", ""]);
    setEditingId(entry._id);
    setInsights(null);
    setView("editor");
  };

  // Open editor for new entry
  const startNewEntry = () => {
    resetEditor();
    setView("editor");
  };

  // When date changes, go back to list
  useEffect(() => {
    setView("list");
    resetEditor();
  }, [dateStr]);

  // Auto-save with debounce (only when editing existing entry)
  const autoSave = useCallback(async () => {
    if (!editingId) return;
    try {
      await fetch(`/api/journal/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawNotes, mood, expandedContent, gratitude: gratitude.filter(Boolean) }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* silent */ }
  }, [editingId, rawNotes, mood, expandedContent, gratitude]);

  useEffect(() => {
    if (!editingId) return;
    const timer = setTimeout(autoSave, 2000);
    return () => clearTimeout(timer);
  }, [rawNotes, mood, autoSave]);

  const combinedInput = [rawNotes, wentWell, drained, tomorrow].filter(Boolean).join(" ");
  const canUseAI = combinedInput.length >= 20;

  const handleAIGenerate = async (mode: string) => {
    if (!canUseAI) {
      return addToast({ message: "Write at least 20 characters first!", type: "info" });
    }
    if (aiCooldown) return;

    setIsExpanding(true);
    setAiCooldown(true);
    setLastMode(mode);
    setInsights(null);

    try {
      const res = await fetch("/api/journal/ai-expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawNotes, wentWell, drained, tomorrow, mood, tone, mode }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      if (mode === "insights" && result.insights) {
        setInsights(result.insights);
        setExpandedContent("");
      } else {
        setExpandedContent(result.text);
        setInsights(null);
      }

      addToast({ message: `AI ${mode} ready!`, type: "success" });
    } catch (e: any) {
      addToast({ message: e.message || "AI generation failed", type: "error" });
    } finally {
      setIsExpanding(false);
      setTimeout(() => setAiCooldown(false), 3000);
    }
  };

  const handleCreateEntry = async () => {
    if (!rawNotes.trim()) return addToast({ message: "Write something first!", type: "info" });
    setIsSaving(true);
    try {
      const moodEmoji = MOOD_OPTIONS.find(m => m.value === mood)?.emoji || "😐";
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawNotes, expandedContent, mood, moodEmoji, date: dateStr,
          gratitude: gratitude.filter(Boolean),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      addToast({ message: "Journal entry saved!", type: "success" });
      await mutate();
      setEditingId(result.data?._id);
    } catch (e: any) {
      addToast({ message: e.message || "Failed to save", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm("Delete this journal entry?")) return;
    try {
      await fetch(`/api/journal/${id}`, { method: "DELETE" });
      addToast({ message: "Entry deleted", type: "success" });
      await mutate();
      setView("list");
      resetEditor();
    } catch {
      addToast({ message: "Delete failed", type: "error" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 w-full pb-24">
        <Skeleton height="52px" rounded="xl" />
        <Skeleton height="200px" rounded="2xl" />
      </div>
    );
  }

  // ─── LIST VIEW ────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="flex flex-col gap-6 pb-24 animate-in fade-in duration-300">
        <DateNavigator selectedDate={selectedDate} onChange={setSelectedDate} />

        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <BookOpen size={18} className="text-[var(--accent)]" /> Journal
          </h1>
          <button onClick={startNewEntry} className="flex items-center gap-1.5 px-3 py-2 bg-[var(--accent)] text-white rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-all">
            <Plus size={14} /> New Entry
          </button>
        </div>

        {entries.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-10 gap-4 cursor-pointer hover:border-[var(--accent)] transition-colors"
            onClick={startNewEntry}>
            <span className="text-4xl">✍️</span>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">No entries yet</h3>
            <p className="text-sm text-[var(--text-muted)]">Tap to start reflecting</p>
            <Button onClick={(e) => { e.stopPropagation(); startNewEntry(); }}>Start Writing</Button>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry: any) => {
              const moodOption = MOOD_OPTIONS.find(m => m.value === entry.mood);
              const preview = entry.rawNotes?.substring(0, 120) || "No content";
              const wordCount = entry.wordCount || (entry.rawNotes || "").split(/\s+/).length;
              const time = entry.createdAt ? format(new Date(entry.createdAt), "h:mm a") : "";

              return (
                <Card
                  key={entry._id}
                  className="p-4 cursor-pointer hover:border-[var(--accent)] transition-all active:scale-[0.99]"
                  onClick={() => openEntry(entry)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">{moodOption?.emoji || "😐"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{moodOption?.label || "Okay"}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-bold">{time}</span>
                      </div>
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed line-clamp-2">{preview}{preview.length >= 120 ? "..." : ""}</p>
                      <div className="flex items-center gap-3 mt-2">
                        {entry.gratitude?.length > 0 && (
                          <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded">{entry.gratitude.length} gratitude</span>
                        )}
                        {entry.expandedContent && (
                          <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded flex items-center gap-1"><Wand2 size={8} /> AI</span>
                        )}
                        <span className="text-[10px] text-[var(--text-muted)]">{wordCount} words</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* FAB Journal Sheet */}
        <BottomSheet isOpen={activeSheet === "journal"} onClose={closeSheet}>
          <div className="flex flex-col gap-4 pb-4">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Quick Journal</h2>
            <Button onClick={() => { closeSheet(); startNewEntry(); }}>New Entry</Button>
          </div>
        </BottomSheet>
      </div>
    );
  }

  // ─── EDITOR VIEW ──────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 pb-24 animate-in fade-in duration-300">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors active:scale-95">
          <ChevronLeft size={18} /> Back
        </button>
        <div className="flex items-center gap-3">
          {saved && <span className="text-[10px] font-bold text-[var(--accent-green)] uppercase tracking-widest animate-in fade-in">✓ Saved</span>}
          {editingId && (
            <button onClick={() => handleDeleteEntry(editingId)} className="p-2 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 rounded-xl transition-colors active:scale-95">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <h2 className="text-lg font-bold text-[var(--text-primary)]">
        {editingId ? "Edit Entry" : "New Entry"}
        <span className="text-xs font-bold text-[var(--text-muted)] ml-2">{format(selectedDate, "MMM d, yyyy")}</span>
      </h2>

      <div className="flex flex-col gap-5">
        {/* Mood Selector */}
        <div className="flex justify-between items-center bg-[var(--bg-elevated)] p-2 rounded-2xl border border-[var(--border)]">
          {MOOD_OPTIONS.map((m) => (
            <button key={m.value} type="button" onClick={() => setMood(m.value)}
              className={`text-3xl transition-all p-2 rounded-xl ${mood === m.value ? "bg-[var(--accent)] shadow-md scale-110" : "grayscale opacity-40 hover:opacity-100 hover:scale-105"}`}>
              {m.emoji}
            </button>
          ))}
        </div>

        {/* Gratitude */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">I'm grateful for...</label>
          {gratitude.map((g, i) => (
            <input key={i} value={g} onChange={e => {
              const next = [...gratitude];
              next[i] = e.target.value;
              setGratitude(next);
            }}
              placeholder={`${i + 1}.`}
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
          ))}
        </div>

        {/* Free Notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Brain Dump</label>
          <textarea
            value={rawNotes}
            onChange={e => setRawNotes(e.target.value)}
            placeholder="Spill your thoughts..."
            className="w-full bg-[var(--bg-elevated)] min-h-[120px] text-[var(--text-primary)] px-4 py-3 rounded-xl border border-[var(--border)] focus:border-[var(--accent)] resize-none focus:outline-none"
          />
          {rawNotes.length > 0 && rawNotes.length < 20 && (
            <span className="text-[10px] text-[var(--accent-amber)] font-bold px-1">Write at least 20 characters to unlock AI features</span>
          )}
        </div>

        {/* ─── AI SECTION ─── */}
        <div className="flex flex-col gap-3 mt-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest px-1">Tone</label>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-0.5">
              {TONES.map(t => (
                <button key={t} type="button" onClick={() => setTone(t)}
                  className={`px-3.5 py-2 rounded-xl text-[11px] font-bold capitalize whitespace-nowrap transition-all ${
                    tone === t
                      ? "bg-[var(--accent)] text-white shadow-sm"
                      : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {AI_MODES.map(m => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={!canUseAI || isExpanding || aiCooldown}
                  onClick={() => handleAIGenerate(m.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-center ${
                    !canUseAI || aiCooldown
                      ? "opacity-40 cursor-not-allowed border-[var(--border)] bg-[var(--bg-elevated)]"
                      : "border-purple-500/30 bg-purple-500/5 text-purple-400 hover:bg-purple-500/10 active:scale-95"
                  } ${isExpanding && lastMode === m.id ? "animate-pulse" : ""}`}
                >
                  <Icon size={18} />
                  <span className="text-[10px] font-bold">{m.label}</span>
                </button>
              );
            })}
          </div>

          {canUseAI && (
            <div className="text-[10px] font-bold text-[var(--text-muted)] px-1 flex items-center gap-1">
              <Wand2 size={10} /> Tone: <span className="capitalize text-[var(--accent)]">{tone}</span>
              {isExpanding && <span className="ml-2 text-purple-400 animate-pulse">Generating...</span>}
            </div>
          )}
        </div>

        {/* AI Output: Expanded Content */}
        {expandedContent && (
          <Card className="p-4 border-purple-500/20 bg-purple-500/5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                <Wand2 size={12} /> AI {lastMode === "expand" ? "Draft" : lastMode === "rewrite" ? "Rewrite" : "Summary"}
              </span>
              <div className="flex gap-2">
                <button onClick={() => handleAIGenerate(lastMode)} disabled={isExpanding || aiCooldown}
                  className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 disabled:opacity-40">
                  <RefreshCw size={10} /> Regenerate
                </button>
                <button onClick={() => setExpandedContent("")} className="text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] underline">Clear</button>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{expandedContent}</p>
            <div className="mt-3 pt-3 border-t border-purple-500/10 flex gap-2 overflow-x-auto scrollbar-hide">
              {TONES.filter(t => t !== tone).slice(0, 3).map(t => (
                <button key={t} onClick={() => { setTone(t); handleAIGenerate(lastMode); }}
                  disabled={isExpanding || aiCooldown}
                  className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 capitalize whitespace-nowrap disabled:opacity-40">
                  Try {t}
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* AI Output: Insights */}
        {insights && (
          <Card className="p-4 border-purple-500/20 bg-purple-500/5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                <Brain size={12} /> Insights
              </span>
              <div className="flex gap-2">
                <button onClick={() => handleAIGenerate("insights")} disabled={isExpanding || aiCooldown}
                  className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 disabled:opacity-40">
                  <RefreshCw size={10} /> Regenerate
                </button>
                <button onClick={() => setInsights(null)} className="text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] underline">Clear</button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border)]">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Emotional State</span>
                <p className="text-sm text-[var(--text-primary)] mt-1 font-medium">{insights.mood}</p>
              </div>
              <div className="bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border)]">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Patterns</span>
                <p className="text-sm text-[var(--text-primary)] mt-1 font-medium">{insights.patterns}</p>
              </div>
              <div className="bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border)]">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Suggestions</span>
                <p className="text-sm text-[var(--text-primary)] mt-1 font-medium">{insights.suggestions}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Save button for new entries */}
      {!editingId && (
        <Button onClick={handleCreateEntry} isLoading={isSaving} className="w-full">
          Save Entry
        </Button>
      )}
    </div>
  );
}
