"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import useSWR from "swr";
import { format, subDays, addDays, startOfDay } from "date-fns";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { DateNavigator } from "@/components/ui/DateNavigator";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ACTIVITY_CATEGORIES } from "@/lib/constants";
import { useUIStore } from "@/store/uiStore";
import {
  type ActivityEntry, type MergedListItem, type AnalyticsData,
  formatTime, formatDuration, calcDuration, hasOverlap, detectGaps,
  addMinutesToTime, nowHHMM, coverageColor, findMergeable, getLastEndTime,
  BREAKDOWN_COLORS, TIMER_STORAGE_KEY,
} from "@/lib/activity-helpers";

const fetcher = (url: string) => fetch(url).then(r => r.json());

type TabType = "timeline" | "pomodoro" | "analytics";
type SheetMode = "add" | "edit" | "fill-gap" | "duplicate";

export default function ActivityPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tab, setTab] = useState<TabType>("timeline");
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data, isLoading, mutate } = useSWR(`/api/activities?date=${dateStr}`, fetcher);
  const { activeSheet, closeSheet, addToast, openSheet } = useUIStore();

  const entries: ActivityEntry[] = useMemo(() => {
    const raw = data?.data?.entries || data?.data || [];
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  const totalMinutes = useMemo(() => entries.reduce((s, a) => s + (a.durationMinutes || 0), 0), [entries]);

  // ─── Pomodoro State (preserved) ──────────────────────────────
  const [workMins, setWorkMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [sessionsToday, setSessionsToday] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [focusLabel, setFocusLabel] = useState("");

  const totalSeconds = phase === "work" ? workMins * 60 : breakMins * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  // ─── Timer Recovery State ────────────────────────────────────
  const [recoveryBanner, setRecoveryBanner] = useState<{ startedAt: number; durationMins: number } | null>(null);

  // ─── Streak ──────────────────────────────────────────────────
  const { data: streakData } = useSWR("/api/timer/streak", fetcher);
  const streak = streakData?.streak ?? 0;

  // ─── Activity Form State ─────────────────────────────────────
  const [actName, setActName] = useState("");
  const [actCategory, setActCategory] = useState("work");
  const [actStart, setActStart] = useState("");
  const [actEnd, setActEnd] = useState("");
  const [actSaving, setActSaving] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>("add");
  const [editingId, setEditingId] = useState<string | null>(null);

  // ─── Autocomplete ────────────────────────────────────────────
  const [recentNames, setRecentNames] = useState<string[]>([]);
  const { data: recentData } = useSWR("/api/activities/recent", fetcher);
  useEffect(() => { if (recentData?.data) setRecentNames(recentData.data); }, [recentData]);

  const filteredNames = useMemo(() => {
    if (!actName.trim()) return [];
    return recentNames.filter(n => n.toLowerCase().includes(actName.toLowerCase())).slice(0, 5);
  }, [actName, recentNames]);

  // ─── Copy Prev Day ──────────────────────────────────────────
  const [copySheetOpen, setCopySheetOpen] = useState(false);
  const [prevDayEntries, setPrevDayEntries] = useState<ActivityEntry[]>([]);
  const [copyMode, setCopyMode] = useState<"keep-times" | "names-only">("names-only");
  const [copyLoading, setCopyLoading] = useState(false);

  // ─── Delete Confirm ──────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // ─── Merge Suggestion ────────────────────────────────────────
  const [mergeSuggestion, setMergeSuggestion] = useState<{ ids: string[]; name: string; count: number } | null>(null);

  // ─── Analytics ───────────────────────────────────────────────
  const [analyticsRange, setAnalyticsRange] = useState<"week" | "month">("week");
  const { data: analyticsRaw, isLoading: analyticsLoading } = useSWR(
    tab === "analytics" ? `/api/activities/analytics?range=${analyticsRange}` : null, fetcher
  );
  const analytics: AnalyticsData | null = analyticsRaw?.data ?? null;

  // ─── Gap Detection ──────────────────────────────────────────
  const mergedList = useMemo(() => detectGaps(entries), [entries]);
  const gapCount = useMemo(() => mergedList.filter(i => i.type === "gap").length, [mergedList]);
  const missingMinutes = 1440 - totalMinutes;
  const coveragePct = Math.min(100, (totalMinutes / 1440) * 100);

  // ─── Duration Preview & Overlap ──────────────────────────────
  const durationPreview = useMemo(() => {
    if (!actStart || !actEnd) return null;
    if (actEnd <= actStart) return { valid: false, crossesMidnight: actEnd < actStart, mins: 0 };
    return { valid: true, crossesMidnight: false, mins: calcDuration(actStart, actEnd) };
  }, [actStart, actEnd]);

  const overlaps = useMemo(() => {
    if (!actStart || !actEnd || !durationPreview?.valid) return [];
    return entries.filter(e => {
      if (sheetMode === "edit" && e._id === editingId) return false;
      return hasOverlap(actStart, actEnd, e.startTime, e.endTime);
    });
  }, [actStart, actEnd, entries, durationPreview, sheetMode, editingId]);

  // ═══════════════════════════════════════════════════════════════
  // POMODORO LOGIC (preserved exactly)
  // ═══════════════════════════════════════════════════════════════

  const handlePomodoroComplete = useCallback(async () => {
    if (phase === "work") {
      try {
        await fetch("/api/timer/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ duration: workMins, date: dateStr, label: focusLabel || undefined }),
        });
        setSessionsToday(p => p + 1);
        addToast({ message: "🍅 Pomodoro complete!", type: "success" });
        localStorage.removeItem(TIMER_STORAGE_KEY);
        mutate();
      } catch { /* ignore */ }
      setPhase("break");
      setTimeLeft(breakMins * 60);
    } else {
      setPhase("work");
      setTimeLeft(workMins * 60);
      addToast({ message: "Break over! Ready for next session.", type: "info" });
    }
    setIsRunning(false);
  }, [phase, workMins, breakMins, dateStr, addToast, mutate, focusLabel]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(p => {
          if (p <= 1) { clearInterval(intervalRef.current!); handlePomodoroComplete(); return 0; }
          return p - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, handlePomodoroComplete]);

  const resetTimer = () => {
    setIsRunning(false);
    setPhase("work");
    setTimeLeft(workMins * 60);
    localStorage.removeItem(TIMER_STORAGE_KEY);
  };

  // Save timer session to localStorage on start
  useEffect(() => {
    if (isRunning && phase === "work") {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify({ sessionStartedAt: Date.now(), durationMins: workMins }));
    }
  }, [isRunning, phase, workMins]);

  // ─── Timer Recovery on Mount ─────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIMER_STORAGE_KEY);
      if (!raw) return;
      const session = JSON.parse(raw);
      const age = Date.now() - session.sessionStartedAt;
      if (age > 7200000) {
        localStorage.removeItem(TIMER_STORAGE_KEY);
      } else {
        setRecoveryBanner(session);
      }
    } catch { localStorage.removeItem(TIMER_STORAGE_KEY); }
  }, []);

  const resumeTimer = () => {
    if (!recoveryBanner) return;
    const elapsed = Math.floor((Date.now() - recoveryBanner.startedAt) / 1000);
    const remaining = Math.max(1, recoveryBanner.durationMins * 60 - elapsed);
    setTimeLeft(remaining);
    setPhase("work");
    setIsRunning(true);
    setRecoveryBanner(null);
    setTab("pomodoro");
  };

  const discardTimer = async () => {
    try {
      await fetch("/api/timer/sessions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: recoveryBanner?.durationMins, date: dateStr, abandoned: true }),
      });
    } catch { /* ignore */ }
    localStorage.removeItem(TIMER_STORAGE_KEY);
    setRecoveryBanner(null);
  };

  // ═══════════════════════════════════════════════════════════════
  // ACTIVITY HANDLERS
  // ═══════════════════════════════════════════════════════════════

  const resetForm = () => { setActName(""); setActStart(""); setActEnd(""); setActCategory("work"); setEditingId(null); setSheetMode("add"); };

  const openAddSheet = () => { resetForm(); setSheetMode("add"); openSheet("activity"); };

  const openEditSheet = (entry: ActivityEntry) => {
    setSheetMode("edit"); setEditingId(entry._id);
    setActName(entry.name); setActCategory(entry.category);
    setActStart(entry.startTime); setActEnd(entry.endTime);
    openSheet("activity");
  };

  const openDuplicateSheet = (entry: ActivityEntry) => {
    setSheetMode("duplicate"); setEditingId(null);
    setActName(entry.name); setActCategory(entry.category);
    setActStart(""); setActEnd("");
    openSheet("activity");
  };

  const openFillGapSheet = (gap: { startTime: string; endTime: string }) => {
    setSheetMode("fill-gap"); setEditingId(null);
    setActName(""); setActCategory("work");
    setActStart(gap.startTime); setActEnd(gap.endTime);
    openSheet("activity");
  };

  const saveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actName || !actStart || !actEnd) return addToast({ message: "Fill all fields", type: "error" });
    if (actEnd <= actStart && actEnd >= actStart) return addToast({ message: "End must be after start", type: "error" });

    setActSaving(true);
    try {
      // Midnight crossing: split into 2 entries
      if (actEnd < actStart) {
        const nextDay = format(addDays(selectedDate, 1), "yyyy-MM-dd");
        await fetch("/api/activities", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: actName, category: actCategory, date: dateStr, startTime: actStart, endTime: "23:59", isPlanned: false }),
        });
        await fetch("/api/activities", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: actName, category: actCategory, date: nextDay, startTime: "00:00", endTime: actEnd, isPlanned: false }),
        });
        addToast({ message: "Split into 2 entries across midnight", type: "success" });
      } else if (sheetMode === "edit" && editingId) {
        await fetch(`/api/activities/${editingId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: actName, category: actCategory, startTime: actStart, endTime: actEnd }),
        });
        addToast({ message: "Activity updated!", type: "success" });
      } else {
        await fetch("/api/activities", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: actName, category: actCategory, date: dateStr, startTime: actStart, endTime: actEnd, isPlanned: false }),
        });
        addToast({ message: "Activity logged!", type: "success" });
      }
      resetForm(); closeSheet(); await mutate();
      // Check merge suggestion
      setTimeout(() => {
        const updated = data?.data?.entries || data?.data || [];
        const merge = findMergeable(Array.isArray(updated) ? updated : []);
        if (merge) setMergeSuggestion(merge);
      }, 500);
    } catch { addToast({ message: "Failed to save", type: "error" }); }
    finally { setActSaving(false); }
  };

  const deleteEntry = async (id: string) => {
    try {
      await fetch(`/api/activities/${id}`, { method: "DELETE" });
      addToast({ message: "Deleted!", type: "success" });
      setDeleteConfirm(null);
      mutate();
    } catch { addToast({ message: "Failed to delete", type: "error" }); }
  };

  const handleMerge = async () => {
    if (!mergeSuggestion) return;
    try {
      await fetch("/api/activities/merge", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: mergeSuggestion.ids }),
      });
      addToast({ message: "Entries merged!", type: "success" });
      setMergeSuggestion(null);
      mutate();
    } catch { addToast({ message: "Merge failed", type: "error" }); }
  };

  const handleCopyPrev = async () => {
    const yesterday = format(subDays(selectedDate, 1), "yyyy-MM-dd");
    try {
      const res = await fetch(`/api/activities?date=${yesterday}`).then(r => r.json());
      const prevEntries = res?.data?.entries || res?.data || [];
      if (!prevEntries.length) {
        addToast({ message: `No activities on ${format(subDays(selectedDate, 1), "MMM d")}`, type: "info" });
        return;
      }
      setPrevDayEntries(prevEntries);
      setCopySheetOpen(true);
    } catch { addToast({ message: "Failed to fetch previous day", type: "error" }); }
  };

  const executeCopy = async () => {
    setCopyLoading(true);
    try {
      if (copyMode === "keep-times") {
        await Promise.all(prevDayEntries.map(e =>
          fetch("/api/activities", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: e.name, category: e.category, date: dateStr, startTime: e.startTime, endTime: e.endTime, isPlanned: false }),
          })
        ));
        addToast({ message: `Copied ${prevDayEntries.length} activities!`, type: "success" });
        mutate();
      } else {
        const names = [...new Set(prevDayEntries.map(e => e.name))];
        setRecentNames(prev => [...new Set([...names, ...prev])]);
        addToast({ message: "Names added to suggestions!", type: "success" });
      }
      setCopySheetOpen(false);
    } catch { addToast({ message: "Copy failed", type: "error" }); }
    finally { setCopyLoading(false); }
  };

  const getCatInfo = (cat: string) => ACTIVITY_CATEGORIES.find(c => c.id === cat) || ACTIVITY_CATEGORIES[7];

  const totalFocusMins = sessionsToday * workMins;

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

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
      {/* ── Timer Recovery Banner ── */}
      {recoveryBanner && !isRunning && (
        <Card className="p-4 border-[#eab308] bg-[#eab30810]">
          <p className="text-sm font-bold text-[var(--text-primary)] mb-2">
            ⏳ You had an unfinished session (started {Math.floor((Date.now() - recoveryBanner.startedAt) / 60000)}m ago)
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={resumeTimer}>Resume</Button>
            <Button size="sm" variant="secondary" onClick={discardTimer}>Discard</Button>
          </div>
        </Card>
      )}

      {/* ── Merge Suggestion Banner ── */}
      {mergeSuggestion && (
        <Card className="p-3 border-[#6c63ff] bg-[#6c63ff10] flex items-center justify-between">
          <p className="text-sm text-[var(--text-primary)]">💡 &apos;{mergeSuggestion.name}&apos; appears {mergeSuggestion.count}× in a row</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleMerge}>Merge</Button>
            <Button size="sm" variant="ghost" onClick={() => setMergeSuggestion(null)}>✕</Button>
          </div>
        </Card>
      )}

      {/* ── Date Navigator + Copy Prev ── */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0"><DateNavigator selectedDate={selectedDate} onChange={setSelectedDate} /></div>
        <button onClick={handleCopyPrev} className="shrink-0 px-3 py-2 text-xs font-bold rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors active:scale-95" title="Copy previous day">📋</button>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-2">
        {(["timeline", "pomodoro", "analytics"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg capitalize tracking-wider transition-colors ${tab === t ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"}`}>
            {t === "timeline" ? "📋 Timeline" : t === "pomodoro" ? "🍅 Pomodoro" : "📊 Analytics"}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TIMELINE TAB                                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === "timeline" && (
        <>
          {/* ── Daily Summary Card ── */}
          <Card className="p-4">
            <p className="text-sm font-bold text-[var(--text-primary)] mb-1">{format(selectedDate, "MMM d, yyyy")}</p>
            <p className="text-xs text-[var(--text-muted)] mb-2">Tracked {formatDuration(totalMinutes)} / 24h</p>
            <div className="w-full h-3 rounded-full bg-[var(--bg-elevated)] overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${coveragePct}%`, backgroundColor: coverageColor(coveragePct) }} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-bold" style={{ color: coverageColor(coveragePct) }}>{Math.round(coveragePct)}%</span>
              <span className="text-[var(--text-muted)]">
                {missingMinutes > 0 ? `⚠️ Missing: ${formatDuration(missingMinutes)}` : "✅ Fully tracked"}
                {gapCount > 0 && ` · ${gapCount} gap${gapCount > 1 ? "s" : ""}`}
              </span>
            </div>
          </Card>

          {/* ── Entry List / Gaps ── */}
          {entries.length === 0 ? (
            <EmptyState title="No activities logged" subtitle="0h tracked · full day missing" buttonText="+ Add Entry" onClick={openAddSheet} />
          ) : (
            <div className="flex flex-col gap-2.5">
              {mergedList.map((item, idx) => {
                if (item.type === "entry") {
                  const e = item.entry;
                  const catInfo = getCatInfo(e.category);
                  const dur = e.durationMinutes || calcDuration(e.startTime, e.endTime);
                  return (
                    <Card key={e._id} className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: catInfo.color + "20" }}>{catInfo.icon}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">{e.name}</h4>
                          <p className="text-xs text-[var(--text-muted)]">{formatTime(e.startTime)} → {formatTime(e.endTime)} · {formatDuration(dur)}</p>
                        </div>
                        <div className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ backgroundColor: catInfo.color + "20", color: catInfo.color }}>{catInfo.label}</div>
                      </div>
                      <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                        <button onClick={() => openEditSheet(e)} className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">✏️ Edit</button>
                        <button onClick={() => setDeleteConfirm({ id: e._id, name: e.name })} className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent-red)] transition-colors">🗑️ Delete</button>
                        <button onClick={() => openDuplicateSheet(e)} className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">📋 Duplicate</button>
                      </div>
                    </Card>
                  );
                } else {
                  const gap = item;
                  return (
                    <div key={`gap-${idx}`} className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed border-[#eab308] bg-[#eab30808]">
                      <span className="text-lg">⚠️</span>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-[#eab308]">{formatTime(gap.startTime)} → {formatTime(gap.endTime)} ({gap.label})</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => openFillGapSheet(gap)}>Fill Gap</Button>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* POMODORO TAB                                               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === "pomodoro" && (
        <div className="flex flex-col items-center gap-8 py-6">
          {/* Focus Label */}
          <input
            value={focusLabel} onChange={e => setFocusLabel(e.target.value)}
            placeholder="What are you focusing on? (optional)"
            className="w-full max-w-xs text-center text-sm px-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />

          <div className="text-center">
            <span className={`text-sm font-bold uppercase tracking-widest ${phase === "work" ? "text-[var(--accent-red)]" : "text-[var(--accent-green)]"}`}>
              {phase === "work" ? "🍅 Focus" : "☕ Break"}
            </span>
          </div>

          <ProgressRing value={progress} size={220} strokeWidth={12} color={phase === "work" ? "var(--accent-red)" : "var(--accent-green)"}>
            <span className="text-5xl font-extrabold text-[var(--text-primary)] tabular-nums">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
          </ProgressRing>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={resetTimer} size="sm"><RotateCcw size={16} /></Button>
            <Button onClick={() => setIsRunning(!isRunning)} size="lg" className="px-10">
              {isRunning ? <Pause size={24} /> : <Play size={24} />}
            </Button>
          </div>

          <div className="flex gap-4 items-center text-center">
            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Work</label>
              <input type="number" value={workMins} onChange={e => { setWorkMins(Number(e.target.value)); if (!isRunning && phase === "work") setTimeLeft(Number(e.target.value) * 60); }}
                className="w-16 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-2 py-1.5 text-center text-[var(--text-primary)] font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Break</label>
              <input type="number" value={breakMins} onChange={e => { setBreakMins(Number(e.target.value)); if (!isRunning && phase === "break") setTimeLeft(Number(e.target.value) * 60); }}
                className="w-16 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl px-2 py-1.5 text-center text-[var(--text-primary)] font-bold" />
            </div>
          </div>

          {/* Enhanced Session Display */}
          <Card className="w-full max-w-sm p-4">
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Today</p>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex flex-wrap gap-0.5">
                {Array.from({ length: Math.min(10, sessionsToday) }).map((_, i) => <span key={i} className="text-lg">🍅</span>)}
                {sessionsToday > 10 && <span className="text-xs text-[var(--text-muted)] self-center ml-1">+{sessionsToday - 10} more</span>}
              </div>
              {sessionsToday > 0 && <span className="text-xs text-[var(--text-secondary)] ml-auto">{sessionsToday} session{sessionsToday !== 1 ? "s" : ""} · {formatDuration(totalFocusMins)}</span>}
              {sessionsToday === 0 && <span className="text-xs text-[var(--text-muted)]">No sessions yet</span>}
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-[var(--border)]">
              <span className="text-sm">Streak</span>
              <span className="ml-auto text-sm font-bold text-[var(--text-primary)]">{streak > 0 ? `🔥 ${streak} days` : "No streak yet"}</span>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ANALYTICS TAB                                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {tab === "analytics" && (
        <div className="flex flex-col gap-6">
          {/* Range Toggle */}
          <div className="flex gap-2">
            {(["week", "month"] as const).map(r => (
              <button key={r} onClick={() => setAnalyticsRange(r)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg capitalize transition-colors ${analyticsRange === r ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"}`}>
                This {r === "week" ? "Week" : "Month"}
              </button>
            ))}
          </div>

          {analyticsLoading ? (
            <div className="flex flex-col gap-4"><Skeleton height="200px" rounded="2xl" /><Skeleton height="200px" rounded="2xl" /></div>
          ) : !analytics ? (
            <EmptyState title="No analytics data" subtitle="No data yet for this period" />
          ) : (
            <>
              {/* ── 5B: Activity Coverage ── */}
              <Card className="p-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Activity Coverage</h3>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--text-secondary)] mb-4">
                  <span>Fully tracked (&gt;80%): <b className="text-[var(--text-primary)]">{analytics.coverage.fullyTrackedCount}/{analytics.coverage.days.length} days</b></span>
                  <span>Avg/day: <b className="text-[var(--text-primary)]">{formatDuration(analytics.coverage.avgTrackedMins)}</b></span>
                  {analytics.coverage.bestDay && <span>Best: <b className="text-[var(--text-primary)]">{format(new Date(analytics.coverage.bestDay.date), "MMM d")} — {formatDuration(analytics.coverage.bestDay.trackedMins)}</b></span>}
                </div>
                <div className="flex flex-col gap-2">
                  {analytics.coverage.days.map(d => (
                    <div key={d.date} className="flex items-center gap-3">
                      <span className="w-8 text-xs font-bold text-[var(--text-secondary)]">{format(new Date(d.date), "EEE")}</span>
                      <div className="flex-1 h-2.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${d.pct}%`, backgroundColor: coverageColor(d.pct) }} />
                      </div>
                      <span className="w-10 text-right text-xs font-bold" style={{ color: coverageColor(d.pct) }}>{Math.round(d.pct)}%</span>
                      <span className="w-4 text-center text-xs">{!d.hasData ? "–" : d.pct >= 80 ? "✓" : "✗"}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* ── 5C: Time Breakdown ── */}
              <Card className="p-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Time Breakdown</h3>
                <div className="flex flex-col gap-3">
                  {analytics.breakdown.map((b, i) => (
                    <div key={b.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-[var(--text-primary)]">{b.label}</span>
                        <span className="text-[var(--text-muted)]">{b.hours}h · {Math.round(b.pct)}%</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${b.pct}%`, backgroundColor: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* ── 5D: Focus Sessions ── */}
              <Card className="p-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Focus Sessions</h3>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--text-secondary)] mb-4">
                  <span>Sessions: <b className="text-[var(--text-primary)]">{analytics.focus.totalSessions}</b></span>
                  <span>Total: <b className="text-[var(--text-primary)]">{formatDuration(analytics.focus.totalMins)}</b></span>
                  <span>Avg/day: <b className="text-[var(--text-primary)]">{analytics.focus.avgPerDay}</b></span>
                  {analytics.focus.bestDay && <span>Best: <b className="text-[var(--text-primary)]">{format(new Date(analytics.focus.bestDay.date), "MMM d")} — {analytics.focus.bestDay.count}</b></span>}
                  <span>Abandoned: <b className="text-[var(--text-primary)]">{analytics.focus.abandonedCount}</b></span>
                </div>
                <div className="flex flex-col gap-2">
                  {analytics.focus.days.map(d => (
                    <div key={d.date} className="flex items-center gap-3">
                      <span className="w-8 text-xs font-bold text-[var(--text-secondary)]">{format(new Date(d.date), "EEE")}</span>
                      <div className="flex flex-wrap gap-0.5 flex-1">
                        {Array.from({ length: Math.min(10, d.count) }).map((_, i) => <span key={i} className="text-sm">🍅</span>)}
                        {d.count > 10 && <span className="text-[10px] text-[var(--text-muted)] self-center">+{d.count - 10}</span>}
                        {d.count === 0 && <span className="text-[10px] text-[var(--text-muted)]">—</span>}
                      </div>
                      <span className="w-6 text-right text-xs font-bold text-[var(--text-secondary)]">{d.count}</span>
                      <span className="w-4 text-center text-xs">{d.hitTarget ? "✓" : "✗"}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* ── 5E: Focus Streak ── */}
              <Card className="p-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Focus Streak</h3>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between"><span>🔥 Current streak</span><b className="text-[var(--text-primary)]">{analytics.streak.current} days</b></div>
                  <div className="flex justify-between"><span>🏆 Longest streak</span><b className="text-[var(--text-primary)]">{analytics.streak.longest} days</b></div>
                  <div className="flex justify-between"><span>📅 This month</span><b className="text-[var(--text-primary)]">{analytics.streak.thisMonthDays} / {analytics.streak.totalDays} days</b></div>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* DELETE CONFIRM OVERLAY                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-[95] flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <Card className="p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold text-[var(--text-primary)] mb-4">Delete &apos;{deleteConfirm.name}&apos;?</p>
            <div className="flex gap-3">
              <Button variant="danger" size="sm" onClick={() => deleteEntry(deleteConfirm.id)}>Yes, Delete</Button>
              <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ADD / EDIT ACTIVITY SHEET                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <BottomSheet isOpen={activeSheet === "activity"} onClose={() => { closeSheet(); resetForm(); }}>
        <div className="flex flex-col gap-5 pb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {sheetMode === "edit" ? "Edit Activity" : sheetMode === "fill-gap" ? "Fill Gap" : sheetMode === "duplicate" ? "Duplicate Activity" : "Log Activity"}
          </h2>
          <form onSubmit={saveActivity} className="flex flex-col gap-4">
            {/* Description + Autocomplete */}
            <div className="relative">
              <Input label="Activity Name" value={actName} onChange={e => setActName(e.target.value)} placeholder="e.g. Deep work session" required />
              {filteredNames.length > 0 && actName.trim() && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {filteredNames.map(n => (
                    <button key={n} type="button" onClick={() => { setActName(n); }}
                      className="px-3 py-1 text-xs font-medium rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors">{n}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Category Grid */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Category</label>
              <div className="grid grid-cols-4 gap-2">
                {ACTIVITY_CATEGORIES.map(cat => (
                  <button key={cat.id} type="button" onClick={() => setActCategory(cat.id)}
                    className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all ${actCategory === cat.id ? "text-white shadow-sm" : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]"}`}
                    style={actCategory === cat.id ? { backgroundColor: cat.color } : {}}>
                    <span className="text-lg">{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Time + Smart Buttons */}
            <div>
              <Input label="Start Time" type="time" value={actStart} onChange={e => setActStart(e.target.value)} required />
              <div className="flex gap-2 mt-1.5">
                <button type="button" onClick={() => setActStart(nowHHMM())} className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors">Now</button>
                <button type="button" onClick={() => setActStart(getLastEndTime(entries))} className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors">Last End</button>
              </div>
            </div>

            {/* Duration Preview */}
            {actStart && actEnd && (
              <div className="text-xs font-medium px-1">
                {actEnd < actStart ? (
                  <span className="text-[#eab308]">🌙 Crosses midnight — will split into 2 entries</span>
                ) : actEnd === actStart ? (
                  <span className="text-[var(--accent-red)]">⚠️ End must be after start</span>
                ) : durationPreview?.valid ? (
                  <span className="text-[#22c55e]">Duration: {formatDuration(durationPreview.mins)}</span>
                ) : null}
              </div>
            )}

            {/* End Time + Quick Duration Buttons */}
            <div>
              <Input label="End Time" type="time" value={actEnd} onChange={e => setActEnd(e.target.value)} required />
              <div className="flex gap-2 mt-1.5">
                {[{ l: "+25m", m: 25 }, { l: "+30m", m: 30 }, { l: "+1h", m: 60 }, { l: "+2h", m: 120 }].map(b => (
                  <button key={b.l} type="button" onClick={() => {
                    if (!actStart) { addToast({ message: "Set a start time first", type: "error" }); return; }
                    setActEnd(addMinutesToTime(actStart, b.m));
                  }} className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors">{b.l}</button>
                ))}
              </div>
            </div>

            {/* Overlap Warning */}
            {overlaps.length > 0 && (
              <div className="text-xs font-medium text-[#eab308] bg-[#eab30808] px-3 py-2 rounded-lg border border-[#eab30830]">
                ⚠️ Overlaps with{" "}
                {overlaps.map((o, i) => (
                  <span key={o._id}>{i > 0 && ", "}&apos;{o.name}&apos; ({formatTime(o.startTime)} – {formatTime(o.endTime)})</span>
                ))}
              </div>
            )}

            <Button type="submit" isLoading={actSaving} className="w-full">{sheetMode === "edit" ? "Update Activity" : "Save Activity"}</Button>
          </form>
        </div>
      </BottomSheet>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* COPY PREVIOUS DAY SHEET                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <BottomSheet isOpen={copySheetOpen} onClose={() => setCopySheetOpen(false)}>
        <div className="flex flex-col gap-5 pb-4">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Copy {prevDayEntries.length} activities from {format(subDays(selectedDate, 1), "MMM d")}?
          </h2>
          <div className="flex flex-col gap-3">
            {(["keep-times", "names-only"] as const).map(mode => (
              <button key={mode} type="button" onClick={() => setCopyMode(mode)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${copyMode === mode ? "border-[var(--accent)] bg-[var(--accent)]10" : "border-[var(--border)] bg-[var(--bg-elevated)]"}`}>
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${copyMode === mode ? "border-[var(--accent)]" : "border-[var(--border)]"}`}>
                  {copyMode === mode && <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />}
                </span>
                <span className="text-sm text-[var(--text-primary)]">{mode === "keep-times" ? "Keep times (same schedule)" : "Copy names only"}</span>
              </button>
            ))}
          </div>
          <Button onClick={executeCopy} isLoading={copyLoading} className="w-full">Copy</Button>
        </div>
      </BottomSheet>
    </div>
  );
}
