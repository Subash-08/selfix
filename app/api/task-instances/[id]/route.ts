import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { TaskInstance } from "@/models/TaskInstance";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const unwrappedParams = await params;
    const id = unwrappedParams.id;
    const body = await req.json();

    await connectDB();
    const instance = await TaskInstance.findOne({ _id: id, userId: session.user.id });
    if (!instance) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    // Fields to update
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.color !== undefined) updates.color = body.color;
    if (body.category !== undefined) updates.category = body.category;
    if (body.mode !== undefined) updates.mode = body.mode;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.targetDuration !== undefined) updates.targetDuration = body.targetDuration;

    if (body.loggedTime !== undefined) {
      if (body.loggedTime < 0) body.loggedTime = 0;
      updates.loggedTime = body.loggedTime;
      
      const target = updates.targetDuration !== undefined ? updates.targetDuration : instance.targetDuration;
      
      if (target > 0) {
        let progress = (body.loggedTime / target) * 100;
        if (progress > 100) progress = 100;
        updates.progress = progress;
        if (progress >= 100) {
           updates.status = 'completed';
        } else if (progress > 0) {
           updates.status = 'in_progress';
        } else {
           updates.status = 'not_started';
        }
      } else {
        // Boolean task
        if (body.loggedTime > 0) {
           updates.progress = 100;
           updates.status = 'completed';
        } else {
           updates.progress = 0;
           updates.status = 'not_started';
        }
      }
    }

    await TaskInstance.updateOne({ _id: id }, { $set: updates });

    return NextResponse.json({ success: true, updates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const unwrappedParams = await params;
    const id = unwrappedParams.id;

    await connectDB();

    // Soft delete
    await TaskInstance.updateOne(
      { _id: id, userId: session.user.id },
      { $set: { isDeleted: true } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
