import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { TaskTemplate } from "@/models/TaskTemplate";
import { z } from "zod";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    await connectDB();

    const query: any = { userId: session.user.id, isDeleted: false };
    if (category) query.category = category;

    const tasks = await TaskTemplate.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const schema = z.object({
      name: z.string().min(1).max(100),
      icon: z.string().optional(),
      color: z.string().optional(),
      category: z.enum(['work', 'learning', 'health', 'personal', 'custom']),
      mode: z.enum(['target-min', 'target-max']),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      targetDuration: z.number().default(0), // 0 is checkbox task
      recurrence: z.object({
        type: z.enum(['daily', 'weekdays', 'custom']),
        weekdays: z.array(z.number()).optional(),
        interval: z.number().optional(),
      })
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
    }

    await connectDB();

    const task = await TaskTemplate.create({
      userId: session.user.id,
      ...parsed.data,
    });

    return NextResponse.json({ success: true, data: task });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
