import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Habit from "@/models/Habit";
import HabitCheckin from "@/models/HabitCheckin";
import MoneyEntry from "@/models/MoneyEntry";
import Budget from "@/models/Budget";
import ActivityEntry from "@/models/ActivityEntry";
import PomodoroSession from "@/models/PomodoroSession";
import JournalEntry from "@/models/JournalEntry";
import HealthLog from "@/models/HealthLog";
import Streak from "@/models/Streak";
import Goal from "@/models/Goal";
import DayBalance from "@/models/DayBalance";
import { startOfDay, addDays, format, isSameDay, getDay } from "date-fns";

function isDueToday(habit: any, date: Date): boolean {
  if (!habit.active) return false;
  const freq = habit.frequency;
  if (!freq) return true;
  if (freq.type === "daily") return true;
  if (freq.type === "weekly" && freq.daysOfWeek?.length) {
    return freq.daysOfWeek.includes(getDay(date));
  }
  return true;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const userId = session.user.id;
    const date = startOfDay(new Date(dateParam));
    const nextDay = addDays(date, 1);

    await connectDB();

    // Habits
    const habits = await Habit.find({ userId, active: true }).lean();
    const todayCheckins = await HabitCheckin.find({ userId, date: { $gte: date, $lt: nextDay } }).lean();
    const dueToday = habits.filter(h => isDueToday(h, date));
    const completedToday = todayCheckins.filter((c: any) => c.completed).length;
    const habitScore = dueToday.length > 0 ? Math.round((completedToday / dueToday.length) * 100) : 100;

    // Money
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const budgets = await Budget.find({ userId, month: format(date, "yyyy-MM") }).lean();
    const monthlyExpenses = await MoneyEntry.find({ userId, type: "expense", date: { $gte: monthStart, $lt: nextDay } }).lean();
    const totalBudget = budgets.reduce((s: number, b: any) => s + b.amount, 0);
    const totalSpent = monthlyExpenses.reduce((s: number, e: any) => s + e.amount, 0);
    const budgetScore = totalBudget > 0 ? Math.max(0, Math.round(((totalBudget - totalSpent) / totalBudget) * 100)) : 100;
    const todaySpent = monthlyExpenses.filter((e: any) => isSameDay(new Date(e.date), date)).reduce((s: number, e: any) => s + e.amount, 0);

    // Activity
    const activities = await ActivityEntry.find({ userId, date: { $gte: date, $lt: nextDay } }).lean();
    const planned = activities.filter((a: any) => a.isPlanned);
    const completedAct = activities.filter((a: any) => a.completedActual);
    const activityScore = planned.length > 0 ? Math.round((completedAct.length / planned.length) * 100) : 100;
    const totalMinutes = activities.reduce((s: number, a: any) => s + (a.durationMinutes || 0), 0);

    // Pomodoro count
    const pomodoroCount = await PomodoroSession.countDocuments({ userId, startedAt: { $gte: date, $lt: nextDay }, completed: true });

    // Journal
    const journal = await JournalEntry.findOne({ userId, date: { $gte: date, $lt: nextDay } }).lean();

    // Health
    const health = await HealthLog.findOne({ userId, date: { $gte: date, $lt: nextDay } }).lean() as any;
    const waterGoalMet = health ? (health.water?.logged >= health.water?.goal) : false;
    const sleepLogged = health ? !!health.sleep?.bedtime : false;
    const healthScore = Math.round(((waterGoalMet ? 50 : 0) + (sleepLogged ? 50 : 0)));

    // Streaks
    const streaks = await Streak.find({ userId }).lean();

    // Goals
    const goals = await Goal.find({ userId, status: "active" }).sort({ deadline: 1 }).limit(1).lean();

    // Day balance
    const dayBalance = await DayBalance.findOne({ userId, date: { $gte: date, $lt: nextDay } }).lean();

    // Composite daily score
    const dailyScore = Math.round(
      habitScore * 0.30 +
      activityScore * 0.25 +
      budgetScore * 0.20 +
      healthScore * 0.15 +
      (journal ? 100 : 0) * 0.10
    );

    return NextResponse.json({
      success: true,
      data: {
        dailyScore,
        habits: {
          completed: completedToday,
          total: dueToday.length,
          score: habitScore,
          list: dueToday.slice(0, 5).map((h: any) => ({
            _id: h._id,
            name: h.name,
            icon: h.icon,
            done: todayCheckins.some((c: any) => c.habitId?.toString() === h._id?.toString() && c.completed),
          })),
        },
        money: { todaySpent, budgetScore, totalBudget, totalSpent, dayBalance },
        activity: { totalMinutes, score: activityScore, pomodoroCount },
        journal: {
          written: !!journal,
          mood: (journal as any)?.mood,
          moodEmoji: (journal as any)?.moodEmoji,
          preview: (journal as any)?.expandedContent?.slice(0, 100) || (journal as any)?.rawNotes?.slice(0, 100) || "",
        },
        health: {
          waterLogged: health?.water?.logged || 0,
          waterGoal: health?.water?.goal || 8,
          score: healthScore,
        },
        streaks: streaks.slice(0, 6),
        nextGoal: goals[0] || null,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
