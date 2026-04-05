import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import PomodoroSession from "@/models/PomodoroSession";
import { startOfDay, subDays } from "date-fns";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    await connectDB();

    // Find all unique dates where user completed a session
    const sessions = await PomodoroSession.find({
      userId: session.user.id,
      completed: true,
    }).sort({ startedAt: -1 }).lean();

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ success: true, streak: 0 });
    }

    const uniqueDates = Array.from(new Set(
      sessions.map((s: any) => startOfDay(new Date(s.startedAt)).getTime())
    )).sort((a, b) => b - a); // newest first

    let streak = 0;
    const today = startOfDay(new Date()).getTime();
    const yesterday = startOfDay(subDays(new Date(), 1)).getTime();

    // Check if the streak is currently active (today or yesterday has a session)
    if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
      streak = 1;
      let expectedDate = uniqueDates[0];

      for (let i = 1; i < uniqueDates.length; i++) {
        expectedDate = startOfDay(subDays(new Date(expectedDate), 1)).getTime();
        if (uniqueDates[i] === expectedDate) {
          streak++;
        } else {
          break;
        }
      }
    }

    return NextResponse.json({ success: true, streak });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
