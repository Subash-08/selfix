import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/Task";
import { startOfWeek, addDays, format } from "date-fns";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const weekStr = searchParams.get("week");

    await connectDB();

    if (dateStr) {
      const tasks = await Task.find({ userId: session.user.id, date: dateStr }).sort({ order: 1 }).lean();
      return NextResponse.json({ success: true, data: tasks });
    }

    if (weekStr) {
      // Returns an object keyed by each day of the week
      const tasks = await Task.find({ 
        userId: session.user.id, 
        // We could filter by date >= monday and <= sunday
        // but for simplicity let's just fetch them and group
      }).sort({ order: 1 }).lean();

      const weekDates = Array.from({ length: 7 }, (_, i) => 
        format(addDays(new Date(weekStr), i), "yyyy-MM-dd")
      );

      const grouped: Record<string, typeof tasks> = {};
      for (const d of weekDates) {
        grouped[d] = [];
      }
      for (const t of tasks) {
        if (grouped[t.date]) {
          grouped[t.date].push(t);
        }
      }

      return NextResponse.json({ success: true, data: grouped });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, date, order } = body;

    if (!title || !date) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    const task = await Task.create({
      userId: session.user.id,
      title,
      date,
      order: order || 0,
      completed: false,
    });

    return NextResponse.json({ success: true, data: task });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
