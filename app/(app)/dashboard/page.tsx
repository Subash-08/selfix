"use client";

import useSWR from "swr";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { StreakBadge } from "@/components/ui/StreakBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  IndianRupee, RotateCcw, PenSquare, Activity,
  CheckCircle2, Droplet, Target, Flame, CheckSquare,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function DashboardPage() {
  const { data: session } = useSession();
  const { data, isLoading, error } = useSWR("/api/analytics/summary?period=today", fetcher, {
    refreshInterval: 60000,
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const today = format(new Date(), "EEEE, MMMM do");

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 w-full pb-24">
        <div>
          <Skeleton width="180px" height="32px" className="mb-2" />
          <Skeleton width="140px" height="20px" />
        </div>
        <div className="flex justify-center w-full">
          <Skeleton width="160px" height="160px" rounded="full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton height="88px" rounded="2xl" />
          <Skeleton height="88px" rounded="2xl" />
          <Skeleton height="88px" rounded="2xl" />
          <Skeleton height="88px" rounded="2xl" />
        </div>
        <Skeleton height="130px" rounded="2xl" />
        <Skeleton height="100px" rounded="2xl" />
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-[var(--text-muted)]">Something went wrong</p>
        <button onClick={() => window.location.reload()} className="text-sm font-bold text-[var(--accent)] underline">
          Tap to retry
        </button>
      </div>
    );
  }

  const d = data.data;
  const habitList = d.habits?.list || [];
  const actMins = d.activity?.totalMinutes || 0;
  const actH = Math.floor(actMins / 60);
  const actM = actMins % 60;

  return (
    <div className="flex flex-col gap-8 pb-24 animate-in fade-in duration-500">
      {/* Greeting */}
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--accent)]">
          {getGreeting()}, {session?.user?.name?.split(" ")[0] || "there"} 👋
        </h1>
        <p className="text-[var(--text-secondary)] font-medium mt-1">{today}</p>
      </header>

      {/* Composite Score */}
      <section className="flex flex-col items-center justify-center py-4">
        <ProgressRing value={d.dailyScore || 0} size={180} strokeWidth={14} color="var(--accent)">
          <span className="text-4xl font-extrabold text-[var(--text-primary)]">{d.dailyScore || 0}</span>
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Score</span>
        </ProgressRing>
      </section>

      {/* Four Mini Cards */}
      <section className="grid grid-cols-2 gap-4">
        <Link href="/money">
          <Card className="flex flex-col gap-1 relative overflow-hidden group hover:border-[var(--accent-red)] transition-colors">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <IndianRupee size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Spent</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">₹{d.money?.todaySpent || 0}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Budget health: {d.money?.budgetScore ?? 50}%</p>
            <div className="absolute top-0 right-0 p-2 opacity-10 blur-sm">
              <IndianRupee size={48} className="text-[var(--accent-red)]" />
            </div>
          </Card>
        </Link>

        <Link href="/habits">
          <Card className="flex flex-col gap-1 relative overflow-hidden group hover:border-[var(--accent-amber)] transition-colors">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <RotateCcw size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Habits</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {d.habits?.completed || 0} / {d.habits?.total || 0}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">{d.habits?.score || 0}% today</p>
            <div className="absolute top-0 right-0 p-2 opacity-10 blur-sm">
              <RotateCcw size={48} className="text-[var(--accent-amber)]" />
            </div>
          </Card>
        </Link>

        <Link href="/journal">
          <Card className="flex flex-col gap-1 relative overflow-hidden group hover:border-[var(--accent-green)] transition-colors">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <PenSquare size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Journal</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {d.journal?.written ? (
                <span className="text-[var(--accent-green)]">Done ✓</span>
              ) : (
                <span className="text-[var(--text-muted)] text-lg">Write today →</span>
              )}
            </p>
            <div className="absolute top-0 right-0 p-2 opacity-10 blur-sm">
              <PenSquare size={48} className="text-[var(--accent-green)]" />
            </div>
          </Card>
        </Link>

        <Link href="/activity">
          <Card className="flex flex-col gap-1 relative overflow-hidden group hover:border-[var(--accent-blue)] transition-colors">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Activity size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Active</span>
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {actH}h {actM}m
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">🍅 {d.activity?.pomodoroCount || 0} sessions</p>
            <div className="absolute top-0 right-0 p-2 opacity-10 blur-sm">
              <Activity size={48} className="text-[var(--accent-blue)]" />
            </div>
          </Card>
        </Link>
      </section>

      {/* Quick Habits */}
      <section>
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <RotateCcw size={16} className="text-[var(--accent)]" />
          QUICK HABITS
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 snap-x">
          {habitList.length === 0 ? (
            <Link href="/habits">
              <p className="text-xs text-[var(--text-muted)] py-4">No habits yet — tap to add</p>
            </Link>
          ) : (
            habitList.map((h: any) => (
              <Link key={h._id} href="/habits" className="w-[130px] shrink-0 snap-center bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 flex flex-col items-center gap-3 shadow-sm hover:border-[var(--accent)] transition-colors">
                <span className="text-3xl drop-shadow-sm">{h.icon || "✅"}</span>
                <span className="text-xs font-medium text-center line-clamp-1 text-[var(--text-primary)]">{h.name}</span>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${h.done ? "bg-[var(--accent-green)] border-[var(--accent-green)] text-white" : "border-[var(--border-hover)] text-transparent"}`}>
                  <CheckCircle2 size={18} strokeWidth={3} />
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Water + Goal cards */}
      <section className="grid grid-cols-2 gap-4">
        <Link href="/health">
          <Card className="flex flex-col items-center justify-center text-center py-6">
            <Droplet size={24} className="text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {d.health?.waterLogged || 0}/{d.health?.waterGoal || 8}
            </p>
            <p className="text-xs font-medium text-[var(--text-muted)]">glasses today</p>
          </Card>
        </Link>

        <Link href="/goals">
          <Card className="flex flex-col justify-between py-4 min-h-[100px]">
            {d.nextGoal ? (
              <>
                <span className="inline-block px-2 py-0.5 bg-[var(--accent)] text-white text-[10px] font-bold uppercase tracking-wider rounded-sm self-start">
                  Next Task
                </span>
                <h3 className="text-sm font-bold mt-2 text-[var(--text-primary)] leading-snug line-clamp-2">
                  {d.nextGoal.title}
                </h3>
                {d.nextGoal.date && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Due: {d.nextGoal.date}</p>
                )}
              </>
            ) : (
              <>
                <Target size={20} className="text-[var(--accent)]" />
                <h3 className="text-sm font-bold text-[var(--text-muted)] mt-2">Set a goal →</h3>
              </>
            )}
          </Card>
        </Link>
      </section>

      {/* Journal Preview */}
      {d.journal?.written && d.journal.preview && (
        <Link href="/journal">
          <Card className="border-l-4 border-l-[var(--accent)] cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2 mb-3 border-b border-[var(--border)] pb-2">
              <span className="text-lg">{d.journal.moodEmoji || "✍️"}</span>
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Today's Entry</span>
            </div>
            <p className="text-sm text-[var(--text-primary)] leading-relaxed line-clamp-2 italic">
              "{d.journal.preview}"
            </p>
          </Card>
        </Link>
      )}

      {/* Streaks */}
      <section>
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <Flame size={16} className="text-[var(--accent-amber)]" />
          ACTIVE STREAKS
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 snap-x">
          {(d.streaks || []).length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">No active streaks yet</p>
          ) : (
            (d.streaks || []).map((s: any, i: number) => (
              <div key={i} className="snap-center">
                <StreakBadge count={s.currentStreak || 0} />
              </div>
            ))
          )}
        </div>
      </section>

      {/* Tasks Quick View */}
      <section>
        <Link href="/goals">
          <Card className="hover:border-[var(--accent)] transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <CheckSquare size={16} className="text-[var(--accent)]" />
              <span className="text-sm font-bold text-[var(--text-primary)]">TODAY'S TASKS</span>
              <span className="ml-auto text-xs font-bold text-[var(--text-secondary)]">
                {d.tasks?.todayCompleted || 0} / {d.tasks?.todayTotal || 0}
              </span>
            </div>
            {(d.tasks?.todayTotal || 0) === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">No tasks today — tap to add</p>
            ) : (
              <>
                <div className="w-full h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                    style={{ width: `${d.tasks?.todayPct || 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  {d.tasks?.todayPct || 0}% complete
                </p>
              </>
            )}
          </Card>
        </Link>
      </section>
    </div>
  );
}
