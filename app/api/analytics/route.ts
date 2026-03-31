import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import MoneyEntry from "@/models/MoneyEntry";
import PomodoroSession from "@/models/PomodoroSession";
import { startOfDay, format, subDays } from "date-fns";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const today = startOfDay(new Date());
    const weekAgo = subDays(today, 6);

    // Fetch Last 7 Days Financial Burn
    const moneyEntries = await MoneyEntry.find({
      userId: session.user.id,
      date: { $gte: weekAgo },
      type: "expense"
    }).lean();

    // Map into chronological arrays for Recharts
    const moneyDataObj: Record<string, number> = {};
    const pomodoroDataObj: Record<string, number> = {};

    for (let i = 0; i <= 6; i++) {
       const d = format(subDays(today, i), 'EEE'); // "Mon", "Tue"
       moneyDataObj[d] = 0;
       pomodoroDataObj[d] = 0;
    }

    moneyEntries.forEach(m => {
      const d = format(new Date(m.date), 'EEE');
      if (moneyDataObj[d] !== undefined) moneyDataObj[d] += m.amount;
    });

    const moneyData = Object.keys(moneyDataObj).reverse().map(k => ({ day: k, value: moneyDataObj[k] }));

    // Fetch Pomodoro Sessions
    const pomodoros = await PomodoroSession.find({
       userId: session.user.id,
       startedAt: { $gte: weekAgo },
       completed: true
    }).lean();

    pomodoros.forEach(p => {
       const d = format(new Date(p.startedAt), 'EEE');
       if (pomodoroDataObj[d] !== undefined) pomodoroDataObj[d] += 1;
    });

    const pomodoroData = Object.keys(pomodoroDataObj).reverse().map(k => ({ day: k, value: pomodoroDataObj[k] }));

    // Build the "Export DB File" node simulating the Raw JSON requirement
    const exportNode = {
      money: moneyEntries,
      pomodoros: pomodoros,
      timestamp: new Date().toISOString(),
      user: session.user.id
    };

    return NextResponse.json({ 
        success: true, 
        data: { 
           moneyData, 
           pomodoroData,
           exportNode 
        } 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
