import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import HabitCheckin from "@/models/HabitCheckin";
import Habit from "@/models/Habit";
import { updateStreak, freezeStreak } from "@/lib/streakService";
import { z } from "zod";
import { startOfDay, addDays } from "date-fns";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const schema = z.object({
      habitId: z.string(),
      date: z.string(),
      completed: z.boolean(),
      note: z.string().optional(),
      skipped: z.boolean().optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
    }

    await connectDB();

    // Verify habit belongs to user
    const habit = await Habit.findOne({ _id: parsed.data.habitId, userId: session.user.id });
    if (!habit) return NextResponse.json({ success: false, error: "Habit not found" }, { status: 404 });

    const date = startOfDay(new Date(parsed.data.date));
    const nextDay = addDays(date, 1);

    // Upsert checkin for this habit+date
    const checkin = await HabitCheckin.findOneAndUpdate(
      {
        userId: session.user.id,
        habitId: parsed.data.habitId,
        date: { $gte: date, $lt: nextDay },
      },
      {
        $set: {
          userId: session.user.id,
          habitId: parsed.data.habitId,
          date,
          completed: parsed.data.completed,
          skipped: parsed.data.skipped || false,
          note: parsed.data.note,
          ...(parsed.data.completed && { completedAt: new Date() }),
        },
      },
      { upsert: true, new: true }
    );

    // Update streak
    if (parsed.data.skipped) {
      await freezeStreak(session.user.id, "habit", parsed.data.habitId);
    } else if (parsed.data.completed) {
      await updateStreak(session.user.id, "habit", parsed.data.habitId);
    }

    return NextResponse.json({ success: true, data: checkin });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
