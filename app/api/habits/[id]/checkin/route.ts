import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import HabitCheckin from "@/models/HabitCheckin";
import Habit from "@/models/Habit";
import { updateStreak } from "@/lib/streakService";
import { startOfDay } from "date-fns";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();

    // Verify habit belongs to user
    const habit = await Habit.findOne({ _id: id, userId: session.user.id });
    if (!habit) return NextResponse.json({ success: false, error: "Habit not found" }, { status: 404 });

    const todayStart = startOfDay(new Date());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    // Check if already checked in today
    const existing = await HabitCheckin.findOne({
      userId: session.user.id,
      habitId: id,
      date: { $gte: todayStart, $lte: todayEnd },
      completed: true,
    });

    if (existing) {
      // Toggle OFF: remove the checkin
      await HabitCheckin.deleteOne({ _id: existing._id });
      return NextResponse.json({ success: true, data: { checked: false } });
    }

    // Toggle ON: create checkin
    await HabitCheckin.create({
      userId: session.user.id,
      habitId: id,
      date: new Date(),
      completed: true,
      completedAt: new Date(),
    });

    // Update streak
    await updateStreak(session.user.id, "habit", id);

    return NextResponse.json({ success: true, data: { checked: true } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
