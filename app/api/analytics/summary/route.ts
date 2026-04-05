import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { format, startOfWeek, startOfMonth, differenceInDays, subDays, startOfDay, endOfDay } from "date-fns";

// Models
import MoneyEntry from "@/models/MoneyEntry";
import Habit from "@/models/Habit";
import HabitCheckin from "@/models/HabitCheckin";
import ActivityEntry from "@/models/ActivityEntry";
import PomodoroSession from "@/models/PomodoroSession";
import JournalEntry from "@/models/JournalEntry";
import Task from "@/models/Task";

export const dynamic = "force-dynamic";

function buildDateRange(period: string) {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");

  if (period === "week") {
    const start = startOfWeek(now, { weekStartsOn: 1 });
    return {
      today,
      startDate: format(start, "yyyy-MM-dd"),
      endDate: today,
      days: 7,
      startDateObj: start,
      endDateObj: now,
    };
  }
  if (period === "month") {
    const start = startOfMonth(now);
    const days = differenceInDays(now, start) + 1;
    return {
      today,
      startDate: format(start, "yyyy-MM-dd"),
      endDate: today,
      days,
      startDateObj: start,
      endDateObj: now,
    };
  }
  // default: today
  return {
    today,
    startDate: today,
    endDate: today,
    days: 1,
    startDateObj: startOfDay(now),
    endDateObj: endOfDay(now),
  };
}

function fillDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  while (current <= end) {
    dates.push(format(current, "yyyy-MM-dd"));
    current = new Date(current.getTime() + 86400000);
  }
  return dates;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "today";
    const { today, startDate, endDate, days, startDateObj, endDateObj } = buildDateRange(period);

    await connectDB();

    const allDates = fillDates(startDate, endDate);

    // ── MONEY ──────────────────────────────────────────────────────
    let money = {
      todaySpent: 0, periodSpent: 0, periodIncome: 0, netSavings: 0,
      topCategories: [] as any[], dailySpend: [] as any[],
      budgetScore: 50, savingsRate: 0,
    };
    try {
      const moneyEntries = await MoneyEntry.find({
        userId,
        date: { $gte: startDateObj, $lte: endOfDay(new Date(endDate + "T00:00:00")) },
      }).lean();

      const todayStart = startOfDay(new Date(today + "T00:00:00"));
      const todayEnd = endOfDay(todayStart);

      const expenses = moneyEntries.filter((e: any) => e.type === "expense");
      const incomes = moneyEntries.filter((e: any) => e.type === "income");

      const todayExpenses = expenses.filter((e: any) => {
        const d = new Date(e.date);
        return d >= todayStart && d <= todayEnd;
      });

      const todaySpent = todayExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0) / 100;
      const periodSpent = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0) / 100;
      const periodIncome = incomes.reduce((s: number, e: any) => s + (e.amount || 0), 0) / 100;
      const netSavings = periodIncome - periodSpent;

      // Category breakdown
      const catMap: Record<string, { total: number; count: number }> = {};
      for (const e of expenses) {
        const cat = (e as any).category || "other";
        if (!catMap[cat]) catMap[cat] = { total: 0, count: 0 };
        catMap[cat].total += (e as any).amount / 100;
        catMap[cat].count += 1;
      }
      const topCategories = Object.entries(catMap)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5)
        .map(([category, val]) => ({
          category,
          total: val.total,
          count: val.count,
          pct: periodSpent > 0 ? Math.round((val.total / periodSpent) * 100) : 0,
        }));

      // Daily spend with gap fill
      const dailySpendMap: Record<string, number> = {};
      for (const e of expenses) {
        const d = format(new Date((e as any).date), "yyyy-MM-dd");
        dailySpendMap[d] = (dailySpendMap[d] || 0) + (e as any).amount / 100;
      }
      const dailySpend = allDates.map(d => ({ date: d, amount: dailySpendMap[d] || 0 }));

      const budgetScore = periodIncome === 0
        ? 50
        : Math.max(0, Math.min(100, Math.round((1 - periodSpent / periodIncome) * 100)));
      const savingsRate = periodIncome === 0
        ? 0
        : Math.max(0, Math.min(100, Math.round((netSavings / periodIncome) * 100)));

      money = { todaySpent, periodSpent, periodIncome, netSavings, topCategories, dailySpend, budgetScore, savingsRate };
    } catch (e) { console.error("money section failed:", e); }

    // ── HABITS ─────────────────────────────────────────────────────
    let habits = {
      total: 0, completed: 0, score: 0, list: [] as any[],
      weeklyData: [] as any[], bestHabit: null as any, totalCompletions: 0,
    };
    try {
      const allHabits = await Habit.find({ userId, active: { $ne: false } }).lean();
      const habitIds = allHabits.map((h: any) => h._id);

      // Today's checkins
      const todayCheckins = await HabitCheckin.find({
        userId,
        habitId: { $in: habitIds },
        date: { $gte: startOfDay(new Date(today + "T00:00:00")), $lte: endOfDay(new Date(today + "T00:00:00")) },
        completed: true,
      }).lean();
      const doneIds = new Set(todayCheckins.map((c: any) => c.habitId.toString()));

      const total = allHabits.length;
      const completed = doneIds.size;
      const score = total > 0 ? Math.round((completed / total) * 100) : 0;

      // All checkins for last 7 days for weeklyData
      const sevenDaysAgo = startOfDay(subDays(new Date(), 6));
      const last7Checkins = await HabitCheckin.find({
        userId,
        habitId: { $in: habitIds },
        date: { $gte: sevenDaysAgo },
        completed: true,
      }).lean();

      const weeklyData = Array.from({ length: 7 }, (_, i) => {
        const d = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
        const dStart = startOfDay(new Date(d + "T00:00:00"));
        const dEnd = endOfDay(dStart);
        const completedCount = last7Checkins.filter((c: any) => {
          const cd = new Date(c.date);
          return cd >= dStart && cd <= dEnd;
        }).length;
        return { date: d, completedCount, totalHabits: total };
      });

      // Period checkins for totalCompletions
      const periodCheckins = await HabitCheckin.find({
        userId,
        habitId: { $in: habitIds },
        date: { $gte: startDateObj, $lte: endDateObj },
        completed: true,
      }).lean();
      const totalCompletions = periodCheckins.length;

      // Best habit: habit with most completions
      const habitCompletionMap: Record<string, number> = {};
      for (const c of last7Checkins) {
        const id = (c as any).habitId.toString();
        habitCompletionMap[id] = (habitCompletionMap[id] || 0) + 1;
      }
      let bestHabit: any = null;
      let bestCount = 0;
      for (const h of allHabits) {
        const cnt = habitCompletionMap[(h as any)._id.toString()] || 0;
        if (cnt > bestCount) { bestCount = cnt; bestHabit = h; }
      }
      if (bestHabit) {
        bestHabit = { name: bestHabit.name, icon: bestHabit.icon, streak: bestCount };
      }

      const list = allHabits.map((h: any) => ({
        _id: h._id.toString(),
        name: h.name,
        icon: h.icon,
        color: h.color,
        done: doneIds.has(h._id.toString()),
        streak: 0,
      }));

      habits = { total, completed, score, list, weeklyData, bestHabit, totalCompletions };
    } catch (e) { console.error("habits section failed:", e); }

    // ── ACTIVITY ───────────────────────────────────────────────────
    let activity = {
      totalMinutes: 0, pomodoroCount: 0, focusMins: 0, score: 0,
      coveragePct: 0, byCategory: [] as any[], dailyCoverage: [] as any[],
      topActivities: [] as any[], avgDailyMins: 0,
    };
    try {
      const actEntries = await ActivityEntry.find({
        userId,
        date: { $gte: startDateObj, $lte: endOfDay(new Date(endDate + "T00:00:00")) },
      }).lean();

      const pomodoroSessions = await PomodoroSession.find({
        userId,
        startedAt: { $gte: startDateObj, $lte: endOfDay(new Date(endDate + "T00:00:00")) },
        completed: true,
      }).lean();

      const totalMinutes = actEntries.reduce((s: number, e: any) => s + (e.durationMinutes || 0), 0);
      const pomodoroCount = pomodoroSessions.length;
      const focusMins = pomodoroSessions.reduce((s: number, p: any) => s + (p.duration || 0), 0);
      const score = Math.min(100, Math.round((totalMinutes / (days * 480)) * 100));
      const coveragePct = Math.min(100, Math.round((totalMinutes / (days * 1440)) * 100));

      // By category
      const catMap: Record<string, { minutes: number; count: number }> = {};
      for (const e of actEntries) {
        const cat = (e as any).category || "other";
        if (!catMap[cat]) catMap[cat] = { minutes: 0, count: 0 };
        catMap[cat].minutes += (e as any).durationMinutes || 0;
        catMap[cat].count += 1;
      }
      const byCategory = Object.entries(catMap)
        .sort((a, b) => b[1].minutes - a[1].minutes)
        .map(([category, val]) => ({
          category,
          minutes: val.minutes,
          count: val.count,
          pct: totalMinutes > 0 ? Math.round((val.minutes / totalMinutes) * 100) : 0,
        }));

      // Daily coverage with gap fill
      const dailyCoverageMap: Record<string, number> = {};
      for (const e of actEntries) {
        const d = format(new Date((e as any).date), "yyyy-MM-dd");
        dailyCoverageMap[d] = (dailyCoverageMap[d] || 0) + ((e as any).durationMinutes || 0);
      }
      const dailyCoverage = allDates.map(d => {
        const mins = dailyCoverageMap[d] || 0;
        return { date: d, trackedMins: mins, pct: Math.round((mins / 1440) * 100) };
      });

      // Top activities
      const nameMap: Record<string, { totalMins: number; count: number }> = {};
      for (const e of actEntries) {
        const name = (e as any).name || "Unknown";
        if (!nameMap[name]) nameMap[name] = { totalMins: 0, count: 0 };
        nameMap[name].totalMins += (e as any).durationMinutes || 0;
        nameMap[name].count += 1;
      }
      const topActivities = Object.entries(nameMap)
        .sort((a, b) => b[1].totalMins - a[1].totalMins)
        .slice(0, 5)
        .map(([name, val]) => ({ name, totalMins: val.totalMins, count: val.count }));

      const avgDailyMins = days > 0 ? Math.round(totalMinutes / days) : 0;

      activity = { totalMinutes, pomodoroCount, focusMins, score, coveragePct, byCategory, dailyCoverage, topActivities, avgDailyMins };
    } catch (e) { console.error("activity section failed:", e); }

    // ── JOURNAL ────────────────────────────────────────────────────
    let journal = {
      written: false, preview: null as string | null, moodEmoji: null as string | null,
      mood: null as number | null, entriesCount: 0, writingStreak: 0, moodHistory: [] as any[],
    };
    try {
      const todayStart = startOfDay(new Date(today + "T00:00:00"));
      const todayEnd = endOfDay(todayStart);
      const todayEntry = await JournalEntry.findOne({ userId, date: { $gte: todayStart, $lte: todayEnd } }).lean() as any;
      const periodEntries = await JournalEntry.find({
        userId,
        date: { $gte: startDateObj, $lte: endDateObj },
      }).sort({ date: 1 }).lean() as any[];

      const written = !!todayEntry;
      const preview = todayEntry?.rawNotes?.slice(0, 120) || null;
      const moodEmoji = todayEntry?.moodEmoji || null;
      const mood = todayEntry?.mood || null;
      const entriesCount = periodEntries.length;

      // Writing streak: walk back from today
      let writingStreak = 0;
      for (let i = 0; ; i++) {
        const checkDate = subDays(new Date(), i);
        const cs = startOfDay(checkDate);
        const ce = endOfDay(checkDate);
        const found = await JournalEntry.findOne({ userId, date: { $gte: cs, $lte: ce } }).lean();
        if (found) writingStreak++;
        else break;
      }

      const moodHistory = periodEntries.map((e: any) => ({
        date: format(new Date(e.date), "yyyy-MM-dd"),
        mood: e.mood,
        moodEmoji: e.moodEmoji,
      }));

      journal = { written, preview, moodEmoji, mood, entriesCount, writingStreak, moodHistory };
    } catch (e) { console.error("journal section failed:", e); }

    // ── TASKS ──────────────────────────────────────────────────────
    let tasks = {
      todayTotal: 0, todayCompleted: 0, todayPct: 0,
      periodTotal: 0, periodCompleted: 0, completionRate: 0,
      dailyCompletion: [] as any[],
    };
    try {
      const todayTasks = await Task.find({ userId, date: today }).lean();
      const allTasks = await Task.find({ userId, date: { $gte: startDate, $lte: endDate } }).lean();

      const todayTotal = todayTasks.length;
      const todayCompleted = todayTasks.filter((t: any) => t.completed).length;
      const todayPct = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;
      const periodTotal = allTasks.length;
      const periodCompleted = allTasks.filter((t: any) => t.completed).length;
      const completionRate = periodTotal > 0 ? Math.round((periodCompleted / periodTotal) * 100) : 0;

      // Group by date with gap fill
      const taskDateMap: Record<string, { total: number; completed: number }> = {};
      for (const t of allTasks) {
        const d = (t as any).date;
        if (!taskDateMap[d]) taskDateMap[d] = { total: 0, completed: 0 };
        taskDateMap[d].total += 1;
        if ((t as any).completed) taskDateMap[d].completed += 1;
      }
      const dailyCompletion = allDates.map(d => {
        const val = taskDateMap[d] || { total: 0, completed: 0 };
        return {
          date: d,
          total: val.total,
          completed: val.completed,
          pct: val.total > 0 ? Math.round((val.completed / val.total) * 100) : 0,
        };
      });

      tasks = { todayTotal, todayCompleted, todayPct, periodTotal, periodCompleted, completionRate, dailyCompletion };
    } catch (e) { console.error("tasks section failed:", e); }

    // ── STREAKS ────────────────────────────────────────────────────
    let streaks: { name: string; icon: string; currentStreak: number }[] = [];
    try {
      const allHabits = await Habit.find({ userId, active: { $ne: false } }).lean();
      const habitIds = allHabits.map((h: any) => h._id);

      // Count last-N consecutive days each habit was checked in
      const streakList = [];
      for (const h of allHabits) {
        let streak = 0;
        for (let i = 0; i < 365; i++) {
          const d = subDays(new Date(), i);
          const ds = startOfDay(d);
          const de = endOfDay(d);
          const checkin = await HabitCheckin.findOne({
            userId, habitId: (h as any)._id, date: { $gte: ds, $lte: de }, completed: true,
          }).lean();
          if (checkin) streak++;
          else break;
        }
        if (streak > 0) {
          streakList.push({ name: (h as any).name, icon: (h as any).icon, currentStreak: streak });
        }
      }
      streaks = streakList.sort((a, b) => b.currentStreak - a.currentStreak).slice(0, 5);
    } catch (e) { console.error("streaks section failed:", e); }

    // ── DAILY SCORE ────────────────────────────────────────────────
    const dailyScore = Math.round(
      (habits.score * 0.25) +
      (activity.score * 0.25) +
      (money.budgetScore * 0.20) +
      (tasks.todayPct * 0.20) +
      ((journal.written ? 100 : 0) * 0.10)
    );

    // ── NEXT GOAL ──────────────────────────────────────────────────
    let nextGoal: { title: string; date: string } | null = null;
    try {
      const nextTask = await Task.findOne({ userId, completed: false }).sort({ date: 1, createdAt: 1 }).lean() as any;
      if (nextTask) nextGoal = { title: nextTask.title, date: nextTask.date };
    } catch (e) { console.error("nextGoal section failed:", e); }

    return NextResponse.json({
      success: true,
      data: {
        period,
        startDate,
        endDate,
        dailyScore,
        money,
        habits,
        activity,
        journal,
        tasks,
        streaks,
        nextGoal,
      },
    });
  } catch (error: any) {
    console.error("analytics summary error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
