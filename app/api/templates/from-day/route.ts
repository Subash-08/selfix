import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { TaskInstance } from "@/models/TaskInstance";
import { Template } from "@/models/Template";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { date, name, description } = body;

    if (!date || !name) {
      return NextResponse.json({ success: false, error: "date and name required" }, { status: 400 });
    }

    await connectDB();

    const instances = await TaskInstance.find({ userId: session.user.id, date, isDeleted: false }).lean();
    
    if (instances.length === 0) {
      return NextResponse.json({ success: false, error: "No tasks to save on this date" }, { status: 404 });
    }

    const normalize = (val: string) => val.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    // Check if conflicting name exists
    const existingTemplates = await Template.find({ userId: session.user.id }).lean();
    const existingTarget = existingTemplates.find((t: any) => normalize(t.name) === normalize(name));

    if (existingTarget && !body.overwrite) {
       return NextResponse.json({ success: false, conflict: true, error: "Template already exists" }, { status: 409 });
    }

    const templateTasks = instances.map((inst: any) => ({
      name: inst.name,
      icon: inst.icon,
      color: inst.color,
      category: inst.category,
      mode: inst.mode,
      priority: inst.priority,
      targetDuration: inst.targetDuration,
      unit: inst.unit
    }));

    if (existingTarget && body.overwrite) {
       await Template.updateOne({ _id: existingTarget._id }, { $set: { tasks: templateTasks } });
       return NextResponse.json({ success: true, data: existingTarget });
    }

    const template = await Template.create({
      userId: session.user.id,
      name,
      description: description || '',
      tasks: templateTasks
    });

    return NextResponse.json({ success: true, data: template });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
