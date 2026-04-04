import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { TaskInstance } from "@/models/TaskInstance";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { date } = await req.json();
    if (!date) return NextResponse.json({ success: false, error: "Date is required" }, { status: 400 });

    await connectDB();

    const instances = await TaskInstance.find({ userId: session.user.id, date, isDeleted: false });

    const updates = instances.map((inst) => {
      inst.progress = 100;
      inst.status = "completed";
      if (inst.targetDuration) inst.loggedTime = inst.targetDuration;
      return inst.save();
    });

    await Promise.all(updates);

    return NextResponse.json({ success: true, message: "All tasks completed for " + date });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
