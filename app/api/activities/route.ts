import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import ActivityEntry from "@/models/ActivityEntry";
import PomodoroSession from "@/models/PomodoroSession";
import { startOfDay, addDays, differenceInMinutes, parse } from "date-fns";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const date = startOfDay(new Date(dateParam));
    const nextDay = addDays(date, 1);

    await connectDB();

    const entries = await ActivityEntry.find({
      userId: session.user.id,
      date: { $gte: date, $lt: nextDay },
    }).sort({ date: -1 }).lean();

    const pomodoroCount = await PomodoroSession.countDocuments({
      userId: session.user.id,
      startedAt: { $gte: date, $lt: nextDay },
      completed: true,
    });

    return NextResponse.json({
      success: true,
      data: { entries, pomodoroCount },
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
    await connectDB();

    // Calculate duration from start/end times if provided
    let durationMinutes = body.durationMinutes || 0;
    if (body.startTime && body.endTime && !durationMinutes) {
      try {
        const start = parse(body.startTime, "HH:mm", new Date());
        const end = parse(body.endTime, "HH:mm", new Date());
        durationMinutes = Math.abs(differenceInMinutes(end, start));
      } catch { /* fallback to 0 */ }
    }

    const entryDate = body.date ? startOfDay(new Date(body.date)) : new Date();

    const entry = await ActivityEntry.create({
      userId: session.user.id,
      date: entryDate,
      name: body.name,
      category: body.category || "other",
      startTime: body.startTime,
      endTime: body.endTime,
      durationMinutes,
      isPlanned: body.isPlanned || false,
      completedActual: true,
      pomodoroSessions: 0,
      tags: body.tags || [],
    });

    return NextResponse.json({ success: true, data: entry });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
