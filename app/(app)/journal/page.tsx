"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { BookOpen, Wand2, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { DateNavigator } from "@/components/ui/DateNavigator";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { MOOD_OPTIONS } from "@/lib/constants";
import { useUIStore } from "@/store/uiStore";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function JournalPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data, isLoading, mutate } = useSWR(`/api/journal?date=${dateStr}`, fetcher);
  const { activeSheet, closeSheet, addToast, openSheet } = useUIStore();

  const entries = data?.data || [];
  const todayEntry = Array.isArray(entries) ? entries[0] : entries;

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
  const [showEditor, setShowEditor] = useState(false);
  const [saved, setSaved] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load entry data when todayEntry changes
  useEffect(() => {
    if (todayEntry && todayEntry._id) {
      setMood(todayEntry.mood || 3);
      setRawNotes(todayEntry.rawNotes || "");
      setExpandedContent(todayEntry.expandedContent || "");
      setGratitude(todayEntry.gratitude?.length ? todayEntry.gratitude : ["", "", ""]);
      setEditingId(todayEntry._id);
      setShowEditor(true);
    } else {
      setMood(3);
      setRawNotes("");
      setExpandedContent("");
      setGratitude(["", "", ""]);
      setWentWell("");
      setDrained("");
      setTomorrow("");
      setEditingId(null);
      setShowEditor(false);
    }
  }, [todayEntry?._id]);

  // Auto-save with debounce
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

  const handleAIExpand = async () => {
    if (!rawNotes && !wentWell && !tomorrow) {
      return addToast({ message: "Write something first!", type: "info" });
    }
    setIsExpanding(true);
    try {
      const res = await fetch("/api/journal/ai-expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawNotes, wentWell, drained, tomorrow, mood }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setExpandedContent(result.text);
      addToast({ message: "AI expansion ready!", type: "success" });
    } catch (e: any) {
      addToast({ message: e.message || "AI expand failed", type: "error" });
    } finally {
      setIsExpanding(false);
    }
  };

  const handleCreateEntry = async () => {
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
      mutate();
      setShowEditor(true);
      setEditingId(result.data?._id);
    } catch (e: any) {
      addToast({ message: e.message || "Failed to save", type: "error" });
    } finally {
      setIsSaving(false);
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

  return (
    <div className="flex flex-col gap-6 pb-24 animate-in fade-in duration-300">
      <DateNavigator selectedDate={selectedDate} onChange={setSelectedDate} />

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <BookOpen size={18} className="text-[var(--accent)]" /> Journal
        </h1>
        {saved && <span className="text-[10px] font-bold text-[var(--accent-green)] uppercase tracking-widest animate-in fade-in">✓ Saved</span>}
      </div>

      {/* Editor or CTA */}
      {showEditor || editingId ? (
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
          </div>

          {/* AI Expand */}
          {expandedContent ? (
            <Card className="p-4 border-[var(--accent-purple)]/30">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-[var(--accent-purple)] uppercase tracking-widest flex items-center gap-1"><Wand2 size={12} /> AI Draft</span>
                <button onClick={() => setExpandedContent("")} className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] underline">Edit</button>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{expandedContent}</p>
            </Card>
          ) : (
            <Button variant="outline" onClick={handleAIExpand} isLoading={isExpanding} className="border-purple-500 text-purple-400">
              <Wand2 size={16} className="mr-2" /> AI Expand
            </Button>
          )}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center py-10 gap-4 cursor-pointer hover:border-[var(--accent)] transition-colors"
          onClick={() => { setShowEditor(true); }}>
          <span className="text-4xl">✍️</span>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Write today's entry</h3>
          <p className="text-sm text-[var(--text-muted)]">Tap to start reflecting</p>
          <Button onClick={(e) => { e.stopPropagation(); setShowEditor(true); }}>Start Writing</Button>
        </Card>
      )}

      {/* Save button for new entries */}
      {showEditor && !editingId && (
        <Button onClick={handleCreateEntry} isLoading={isSaving} className="w-full">
          Save Entry
        </Button>
      )}

      {/* Add Journal Sheet (FAB) */}
      <BottomSheet isOpen={activeSheet === "journal"} onClose={closeSheet}>
        <div className="flex flex-col gap-4 pb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Quick Journal</h2>
          <p className="text-sm text-[var(--text-secondary)]">Use the editor on the page for full journaling. This opens when you tap the FAB.</p>
          <Button onClick={() => { closeSheet(); setShowEditor(true); }}>Open Editor</Button>
        </div>
      </BottomSheet>
    </div>
  );
}
