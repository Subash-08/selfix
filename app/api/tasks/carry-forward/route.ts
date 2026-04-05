import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/Task";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { ids, date } = body;

    if (!ids || !Array.isArray(ids) || !date) {
      return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 });
    }

    await connectDB();

    await Task.updateMany(
      { _id: { $in: ids }, userId: session.user.id },
      { $set: { date: date } }
    );

    const tasks = await Task.find({ _id: { $in: ids }, userId: session.user.id }).lean();

    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
