import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { TaskInstance } from "@/models/TaskInstance";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { targetDate, sourceDate } = body; // Target date usually today. Source usually targetDate - 1

    if (!targetDate || !sourceDate) {
      return NextResponse.json({ success: false, error: "targetDate and sourceDate required" }, { status: 400 });
    }

    await connectDB();

    const previousInstances = await TaskInstance.find({ 
      userId: session.user.id, 
      date: sourceDate, 
      isDeleted: false 
    }).lean();

    if (previousInstances.length === 0) {
      return NextResponse.json({ success: false, error: "No tasks found on source date" }, { status: 404 });
    }

    // Prepare fresh snapshots
    const newInstances = previousInstances.map(inst => ({
      userId: session.user.id,
      date: targetDate,
      name: inst.name,
      icon: inst.icon,
      color: inst.color,
      category: inst.category,
      mode: inst.mode,
      priority: inst.priority,
      targetDuration: inst.targetDuration,
      unit: inst.unit,
      loggedTime: 0,
      progress: 0,
      status: 'not_started',
      origin: 'copied',
      baseTaskId: inst.baseTaskId,
      templateId: inst.templateId,
      isCustom: inst.isCustom
    }));

    // Soft constraint insert - we ignore duplicate names for the date via catch. Wait, using insertMany with ordered: false is best.
    let inserted = 0;
    try {
      const result = await TaskInstance.insertMany(newInstances, { ordered: false });
      inserted = result.length;
    } catch (err: any) {
      // 11000 is duplicate key error, log how many succeeded.
      if (err.code === 11000) {
        inserted = err.insertedDocs?.length || 0;
      } else {
        throw err;
      }
    }

    return NextResponse.json({ success: true, count: inserted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
