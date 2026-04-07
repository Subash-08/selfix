import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import ActivityEntry from "@/models/ActivityEntry";
import { differenceInMinutes, parse } from "date-fns";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;
    if (!id) {
        return NextResponse.json({ success: false, error: "Activity ID is required" }, { status: 400 });
    }

    const body = await req.json();
    await connectDB();

    // Check if entry exists and belongs to user
    const existingEntry = await ActivityEntry.findOne({ _id: id, userId: session.user.id });
    if (!existingEntry) {
        return NextResponse.json({ success: false, error: "Activity not found" }, { status: 404 });
    }

    // Calculate new duration if start/end times changed
    let durationMinutes = body.durationMinutes || existingEntry.durationMinutes;
    if (body.startTime && body.endTime && body.startTime !== existingEntry.startTime || body.endTime !== existingEntry.endTime) {
      try {
        const start = parse(body.startTime, "HH:mm", new Date());
        const end = parse(body.endTime, "HH:mm", new Date());
        
        let diff = differenceInMinutes(end, start);
        // Handle crosses midnight explicitly in duration if needed
        if (diff < 0) {
            diff += 24 * 60;
        }

        durationMinutes = Math.abs(diff);
      } catch { /* keep existing duration if parse fails */ }
    }

    const updatedEntry = await ActivityEntry.findByIdAndUpdate(
        id,
        {
          name: body.name !== undefined ? body.name : existingEntry.name,
          category: body.category !== undefined ? body.category : existingEntry.category,
          startTime: body.startTime !== undefined ? body.startTime : existingEntry.startTime,
          endTime: body.endTime !== undefined ? body.endTime : existingEntry.endTime,
          durationMinutes,
          isPlanned: body.isPlanned !== undefined ? body.isPlanned : existingEntry.isPlanned,
          tags: body.tags !== undefined ? body.tags : existingEntry.tags,
        },
        { new: true }
    ).lean();

    return NextResponse.json({ success: true, data: updatedEntry });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;
    if (!id) {
        return NextResponse.json({ success: false, error: "Activity ID is required" }, { status: 400 });
    }

    await connectDB();

    const deletedEntry = await ActivityEntry.findOneAndDelete({
        _id: id,
        userId: session.user.id
    });

    if (!deletedEntry) {
        return NextResponse.json({ success: false, error: "Activity not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: deletedEntry });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
