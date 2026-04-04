import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { TaskInstance } from "@/models/TaskInstance";
import { ensureInstancesForDate } from "@/lib/taskUtils";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    await connectDB();

    if (start && end) {
      const instances = await TaskInstance.find({ 
        userId: session.user.id, 
        date: { $gte: start, $lte: end }, 
        isDeleted: false 
      }).lean();

      return NextResponse.json({ success: true, data: instances });
    }

    const singleDate = date || new Date().toISOString().split("T")[0];

    // Fetch instances for the date (no population needed anymore)
    const instances = await TaskInstance.find({ userId: session.user.id, date: singleDate, isDeleted: false }).lean();

    return NextResponse.json({
      success: true,
      data: instances
    });
  } catch (error: any) {
    console.error("GET instances error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    await connectDB();
    await TaskInstance.syncIndexes();

    // Body should contain date, name, icon, mode, priority, targetDuration, etc.
    const newInstance = await TaskInstance.create({
      userId: session.user.id,
      date: body.date,
      name: body.name,
      icon: body.icon || '✅',
      color: body.color || '#3b82f6',
      category: body.category || 'custom',
      mode: body.mode || 'target-min',
      priority: body.priority || 'medium',
      targetDuration: body.targetDuration || 0,
      origin: 'manual',
      isCustom: true
    });

    return NextResponse.json({ success: true, data: newInstance });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: "Task with this name already exists today." }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
