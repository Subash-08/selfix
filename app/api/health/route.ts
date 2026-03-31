import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import HealthLog from "@/models/HealthLog";
import { updateStreak } from "@/lib/streakService";
import { startOfDay, addDays } from "date-fns";

async function getOrCreateLog(userId: string, dateStr: string) {
  const date = startOfDay(new Date(dateStr));
  const nextDay = addDays(date, 1);

  let log = await HealthLog.findOne({ userId, date: { $gte: date, $lt: nextDay } });
  if (!log) {
    log = new HealthLog({
      userId,
      date,
      water: { logged: 0, goal: 8 },
      sleep: {},
      workout: [],
      steps: { count: 0, goal: 10000 },
      calories: { consumed: 0, goal: 2000 },
      meals: [],
    });
    await log.save();
  }
  return log;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || new Date().toISOString().split("T")[0];

    await connectDB();
    const log = await getOrCreateLog(session.user.id, dateParam);

    return NextResponse.json({ success: true, data: log });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const dateParam = body.date || new Date().toISOString().split("T")[0];

    await connectDB();
    const log = await getOrCreateLog(session.user.id, dateParam);

    // Route to correct handler based on action
    switch (body.action) {
      case "add_water":
        log.water.logged = (log.water.logged || 0) + (body.amount || 1);
        if (log.water.logged >= log.water.goal) {
          await updateStreak(session.user.id, "water");
        }
        break;

      case "set_water_goal":
        log.water.goal = body.goal;
        break;

      case "log_sleep":
        log.sleep = {
          bedtime: body.bedtime,
          wakeTime: body.wakeTime,
          quality: body.quality,
          durationMinutes: body.durationMinutes,
        };
        await updateStreak(session.user.id, "sleep");
        break;

      case "log_workout":
        log.workout.push({
          type: body.workoutType || body.type || "Other",
          duration: body.duration || 0,
          sets: body.sets,
          reps: body.reps,
          weight: body.weight,
          notes: body.notes,
        });
        await updateStreak(session.user.id, "workout");
        break;

      case "remove_workout":
        if (body.index !== undefined && log.workout[body.index]) {
          log.workout.splice(body.index, 1);
        }
        break;

      case "log_meal":
        log.meals.push({
          name: body.name,
          calories: body.calories || 0,
          protein: body.protein,
          carbs: body.carbs,
          fat: body.fat,
          time: body.time,
        });
        log.calories.consumed = log.meals.reduce((s: number, m: any) => s + (m.calories || 0), 0);
        break;

      case "update_steps":
        log.steps.count = body.count || body.steps || 0;
        break;

      case "update_weight":
        if (!log.bodyMetrics) log.bodyMetrics = { unit: "kg" };
        log.bodyMetrics.weight = body.weight;
        if (body.unit) log.bodyMetrics.unit = body.unit;
        break;

      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }

    await log.save();
    return NextResponse.json({ success: true, data: log });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
