import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import MoneyEntry from "@/models/MoneyEntry";
import HabitCheckin from "@/models/HabitCheckin";
import ActivityEntry from "@/models/ActivityEntry";
import JournalEntry from "@/models/JournalEntry";
import HealthLog from "@/models/HealthLog";
import PomodoroSession from "@/models/PomodoroSession";
import Goal from "@/models/Goal";
import Streak from "@/models/Streak";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const fmt = searchParams.get("format") || "json";

    await connectDB();
    const userId = session.user.id;

    const [money, checkins, activities, journals, health, pomodoros, goals, streaks] = await Promise.all([
      MoneyEntry.find({ userId }).lean(),
      HabitCheckin.find({ userId }).lean(),
      ActivityEntry.find({ userId }).lean(),
      JournalEntry.find({ userId }).lean(),
      HealthLog.find({ userId }).lean(),
      PomodoroSession.find({ userId }).lean(),
      Goal.find({ userId }).lean(),
      Streak.find({ userId }).lean(),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      userId,
      money,
      habitCheckins: checkins,
      activities,
      journals,
      health,
      pomodoros,
      goals,
      streaks,
    };

    if (fmt === "csv") {
      // Simple CSV: flatten money entries as sample
      const header = "date,type,category,amount,paymentMode,note\n";
      const rows = money.map((e: any) =>
        `${new Date(e.date).toISOString().split("T")[0]},${e.type},${e.category},${e.amount},${e.paymentMode || ""},${(e.note || "").replace(/,/g, ";")}`
      ).join("\n");

      return new Response(header + rows, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=selfix_export.csv",
        },
      });
    }

    return NextResponse.json({ success: true, data: exportData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
