import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/Task";
import { format, addDays } from "date-fns";

// GET /api/todos?date=YYYY-MM-DD   → { data: Task[] }
// GET /api/todos?week=YYYY-MM-DD   → { data: { [dateStr]: Task[] } }
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const weekParam = searchParams.get("week");

    await connectDB();

    if (weekParam) {
      // Build Mon–Sun date strings
      const monday = new Date(weekParam + "T00:00:00");
      const days = Array.from({ length: 7 }, (_, i) =>
        format(addDays(monday, i), "yyyy-MM-dd")
      );

      const tasks = await Task.find({
        userId: session.user.id,
        date: { $in: days },
      })
        .sort({ order: 1 })
        .lean();

      // Group by date key
      const grouped: Record<string, typeof tasks> = {};
      for (const day of days) grouped[day] = [];
      for (const task of tasks) {
        if (grouped[task.date]) grouped[task.date].push(task);
      }

      return NextResponse.json({ success: true, data: grouped });
    }

    const targetDate = dateParam ?? format(new Date(), "yyyy-MM-dd");
    const tasks = await Task.find({
      userId: session.user.id,
      date: targetDate,
    })
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/todos   body: { title, date, order }
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, date, order = 0 } = body;

    if (!title?.trim())
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    if (!date)
      return NextResponse.json({ success: false, error: "Date is required" }, { status: 400 });

    await connectDB();

    const task = await Task.create({
      userId: session.user.id,
      title: title.trim(),
      date,
      order,
      completed: false,
    });

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
