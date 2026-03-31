import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Habit from "@/models/Habit";
import HabitCheckin from "@/models/HabitCheckin";
import Streak from "@/models/Streak";
import { z } from "zod";
import { startOfDay, addDays, getDay } from "date-fns";

function isDueOnDate(habit: any, date: Date): boolean {
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
    const date = startOfDay(new Date(dateParam));
    const nextDay = addDays(date, 1);

    await connectDB();

    const habits = await Habit.find({ userId: session.user.id }).sort({ createdAt: -1 }).lean();
    const checkins = await HabitCheckin.find({
      userId: session.user.id,
      date: { $gte: date, $lt: nextDay },
    }).lean();
    const streaks = await Streak.find({ userId: session.user.id, entityType: "habit" }).lean();

    const habitsWithStatus = habits.map((h: any) => {
      const checkin = checkins.find((c: any) => c.habitId?.toString() === h._id?.toString()) || null;
      const streak = streaks.find((s: any) => s.entityId?.toString() === h._id?.toString()) || null;
      return {
        ...h,
        checkin,
        streak,
        isDueToday: isDueOnDate(h, date),
      };
    });

    const activeHabits = habitsWithStatus.filter(h => h.active);
    const dueHabits = activeHabits.filter(h => h.isDueToday);
    const completedCount = dueHabits.filter(h => h.checkin?.completed).length;
    const completionRate = dueHabits.length > 0 ? Math.round((completedCount / dueHabits.length) * 100) : 100;

    const stackGroups = [...new Set(activeHabits.map(h => h.stackGroup).filter(Boolean))];

    return NextResponse.json({
      success: true,
      data: {
        habits: habitsWithStatus,
        completionRate,
        stackGroups,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const schema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      type: z.enum(["build", "quit"]),
      frequency: z.object({
        type: z.enum(["daily", "weekly", "custom"]),
        daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
        timesPerWeek: z.number().min(1).max(7).optional(),
      }),
      category: z.string(),
      color: z.string(),
      icon: z.string(),
      stackGroup: z.string().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
    }

    await connectDB();

    const habit = await Habit.create({
      userId: session.user.id,
      ...parsed.data,
    });

    return NextResponse.json({ success: true, data: habit });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
