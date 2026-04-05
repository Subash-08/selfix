import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { format } from "date-fns";

import MoneyEntry from "@/models/MoneyEntry";
import Habit from "@/models/Habit";
import HabitCheckin from "@/models/HabitCheckin";
import ActivityEntry from "@/models/ActivityEntry";
import PomodoroSession from "@/models/PomodoroSession";
import JournalEntry from "@/models/JournalEntry";
import Task from "@/models/Task";

export const dynamic = "force-dynamic";

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const fmt = searchParams.get("format") || "json";

    await connectDB();

    const [moneyEntries, habits, habitCheckins, activities, pomodoroSessions, journalEntries, tasks] =
      await Promise.all([
        MoneyEntry.find({ userId }).lean().catch(() => []),
        Habit.find({ userId }).lean().catch(() => []),
        HabitCheckin.find({ userId }).lean().catch(() => []),
        ActivityEntry.find({ userId }).lean().catch(() => []),
        PomodoroSession.find({ userId }).lean().catch(() => []),
        JournalEntry.find({ userId }).lean().catch(() => []),
        Task.find({ userId }).lean().catch(() => []),
      ]);

    const expenses = moneyEntries.filter((e: any) => e.type === "expense");
    const incomes = moneyEntries.filter((e: any) => e.type === "income");

    if (fmt === "csv") {
      const lines: string[] = [];

      lines.push("=== EXPENSES ===");
      lines.push("date,amount,category,description");
      for (const e of expenses) {
        lines.push([
          escapeCsv(format(new Date((e as any).date), "yyyy-MM-dd")),
          escapeCsv(((e as any).amount / 100).toFixed(2)),
          escapeCsv((e as any).category),
          escapeCsv((e as any).note || ""),
        ].join(","));
      }

      lines.push("");
      lines.push("=== INCOME ===");
      lines.push("date,amount,source,description");
      for (const e of incomes) {
        lines.push([
          escapeCsv(format(new Date((e as any).date), "yyyy-MM-dd")),
          escapeCsv(((e as any).amount / 100).toFixed(2)),
          escapeCsv((e as any).category),
          escapeCsv((e as any).note || ""),
        ].join(","));
      }

      lines.push("");
      lines.push("=== HABITS ===");
      lines.push("name,icon,category,totalCompletions");
      const habitCheckinMap: Record<string, number> = {};
      for (const c of habitCheckins) {
        const id = (c as any).habitId.toString();
        if ((c as any).completed) habitCheckinMap[id] = (habitCheckinMap[id] || 0) + 1;
      }
      for (const h of habits) {
        lines.push([
          escapeCsv((h as any).name),
          escapeCsv((h as any).icon),
          escapeCsv((h as any).category),
          escapeCsv(habitCheckinMap[(h as any)._id.toString()] || 0),
        ].join(","));
      }

      lines.push("");
      lines.push("=== ACTIVITIES ===");
      lines.push("date,name,category,startTime,endTime,durationMinutes");
      for (const a of activities) {
        lines.push([
          escapeCsv(format(new Date((a as any).date), "yyyy-MM-dd")),
          escapeCsv((a as any).name),
          escapeCsv((a as any).category),
          escapeCsv((a as any).startTime || ""),
          escapeCsv((a as any).endTime || ""),
          escapeCsv((a as any).durationMinutes || 0),
        ].join(","));
      }

      lines.push("");
      lines.push("=== TASKS ===");
      lines.push("date,title,completed");
      for (const t of tasks) {
        lines.push([
          escapeCsv((t as any).date),
          escapeCsv((t as any).title),
          escapeCsv((t as any).completed ? "yes" : "no"),
        ].join(","));
      }

      const csv = lines.join("\n");
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="selfix_export.csv"',
        },
      });
    }

    // JSON format
    return NextResponse.json({
      success: true,
      data: {
        expenses: expenses.map((e: any) => ({
          date: format(new Date(e.date), "yyyy-MM-dd"),
          amount: e.amount / 100,
          category: e.category,
          note: e.note,
          paymentMode: e.paymentMode,
        })),
        incomes: incomes.map((e: any) => ({
          date: format(new Date(e.date), "yyyy-MM-dd"),
          amount: e.amount / 100,
          category: e.category,
          note: e.note,
          paymentMode: e.paymentMode,
        })),
        habits: habits.map((h: any) => ({
          name: h.name,
          icon: h.icon,
          category: h.category,
          color: h.color,
        })),
        activities: activities.map((a: any) => ({
          date: format(new Date(a.date), "yyyy-MM-dd"),
          name: a.name,
          category: a.category,
          startTime: a.startTime,
          endTime: a.endTime,
          durationMinutes: a.durationMinutes,
        })),
        timerSessions: pomodoroSessions.map((p: any) => ({
          startedAt: p.startedAt,
          endedAt: p.endedAt,
          duration: p.duration,
          completed: p.completed,
        })),
        journalEntries: journalEntries.map((j: any) => ({
          date: format(new Date(j.date), "yyyy-MM-dd"),
          rawNotes: j.rawNotes,
          mood: j.mood,
          moodEmoji: j.moodEmoji,
          wordCount: j.wordCount,
        })),
        tasks: tasks.map((t: any) => ({
          date: t.date,
          title: t.title,
          completed: t.completed,
        })),
      },
    });
  } catch (error: any) {
    console.error("export error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
