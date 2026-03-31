import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import PomodoroSession from "@/models/PomodoroSession";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    await connectDB();

    const result = await PomodoroSession.create({
      userId: session.user.id,
      startedAt: new Date(Date.now() - body.duration * 60 * 1000), 
      endedAt: new Date(),
      duration: body.duration,
      breakDuration: 5,
      completed: true,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
