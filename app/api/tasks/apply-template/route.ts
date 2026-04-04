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
    const { templateId, date, mode, mergeDuplicateStrategy } = body; 
    // mode: 'replace' | 'merge'
    // mergeDuplicateStrategy: 'skip' | 'duplicate' | 'replace' (Only used if mode=merge)

    if (!templateId || !date || !mode) {
      return NextResponse.json({ success: false, error: "templateId, date, and mode required" }, { status: 400 });
    }

    await connectDB();

    const template = await Template.findOne({ _id: templateId, userId: session.user.id }).lean();
    if (!template) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    const normalize = (val: string) => val.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    let existingNames: string[] = [];
    if (mode === 'replace') {
      // Hard delete everything on that date (safe because it's a day reset)
      await TaskInstance.deleteMany({ userId: session.user.id, date });
    } else {
      // Merging. Get existing task names to check for conflicts
      const existing = await TaskInstance.find({ userId: session.user.id, date, isDeleted: false }).select("name").lean();
      existingNames = existing.map((e: any) => normalize(e.name));
    }

    const newInstances = [];

    for (const taskBase of template.tasks) {
      const isDuplicate = existingNames.includes(normalize(taskBase.name));
      
      if (mode === 'merge' && isDuplicate) {
        if (mergeDuplicateStrategy === 'skip') continue;
        
        if (mergeDuplicateStrategy === 'replace') {
           // Delete the old one before creating the new snapshot
           await TaskInstance.updateMany({ userId: session.user.id, date }, {
              "$set": { "isDeleted": true }
           }).where("name").equals(taskBase.name); // basic delete logic
        }
        
        // If duplicate strategy is 'duplicate', we append a suffix
        const finalName = mergeDuplicateStrategy === 'duplicate' ? `${taskBase.name} (Copy)` : taskBase.name;
        
        newInstances.push({
          userId: session.user.id,
          date,
          name: finalName,
          icon: taskBase.icon,
          color: taskBase.color,
          category: taskBase.category,
          mode: taskBase.mode || 'target-min',
          priority: taskBase.priority || 'medium',
          targetDuration: taskBase.targetDuration || 0,
          unit: taskBase.unit || 'minutes',
          loggedTime: 0,
          progress: 0,
          status: 'not_started',
          origin: 'template',
          templateId: template._id,
          templateName: template.name,
          isCustom: false
        });
      } else {
        newInstances.push({
          userId: session.user.id,
          date,
          name: taskBase.name,
          icon: taskBase.icon,
          color: taskBase.color,
          category: taskBase.category,
          mode: taskBase.mode || 'target-min',
          priority: taskBase.priority || 'medium',
          targetDuration: taskBase.targetDuration || 0,
          unit: taskBase.unit || 'minutes',
          loggedTime: 0,
          progress: 0,
          status: 'not_started',
          origin: 'template',
          templateId: template._id,
          templateName: template.name,
          isCustom: false
        });
      }
    }

    if (newInstances.length === 0) {
      // Update template usage nonetheless
      await Template.updateOne({ _id: template._id }, { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } });
      return NextResponse.json({ success: true, count: 0, message: "No tasks inserted (skipped)" });
    }

    let inserted = 0;
    try {
      const result = await TaskInstance.insertMany(newInstances, { ordered: false });
      inserted = result.length;
      
      // Upgrade template
      await Template.updateOne({ _id: template._id }, { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } });
    } catch (err: any) {
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
