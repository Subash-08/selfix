import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { TaskInstance } from "@/models/TaskInstance";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json({ success: false, error: "Missing start or end date" }, { status: 400 });
    }

    await connectDB();

    const instances = await TaskInstance.find({
      userId: session.user.id,
      date: { $gte: start, $lte: end },
      isDeleted: false
    }).lean();

    // 1. Core KPIs
    let totalTime = 0;
    let tasksCompleted = 0;
    const tasksTotal = instances.length;
    let overallProgressSum = 0;

    // Daily tracking
    const daysMap: Record<string, { totalProgress: number; count: number }> = {};
    
    // Category tracking
    const categoryMap: Record<string, { time: number }> = {};
    
    // Task specific tracking
    const taskTrackingMap: Record<string, { 
      name: string; 
      mode: string;
      timesLogged: number; 
      targetSum: number;
      completions: number;
      violations: number;
      count: number;
    }> = {};

    instances.forEach((inst: any) => {
      // Basic sums
      totalTime += (inst.loggedTime || 0);

      // Progress math
      let progress = 0;
      if (inst.mode === 'target-max') {
        if ((inst.loggedTime || 0) <= (inst.targetDuration || 0)) {
           progress = 100;
        } else {
           progress = 0;
        }
      } else {
         progress = inst.progress || 0;
      }
      overallProgressSum += progress;

      if (progress >= 100) tasksCompleted++;

      // Daily Day Map
      if (!daysMap[inst.date]) daysMap[inst.date] = { totalProgress: 0, count: 0 };
      daysMap[inst.date].totalProgress += progress;
      daysMap[inst.date].count += 1;

      // Categories
      const cat = inst.category || 'Uncategorized';
      if (!categoryMap[cat]) categoryMap[cat] = { time: 0 };
      categoryMap[cat].time += (inst.loggedTime || 0);

      // Task Tracking
      const normalize = (n: string) => n.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const key = normalize(inst.name);
      
      if (!taskTrackingMap[key]) {
        taskTrackingMap[key] = {
           name: inst.name,
           mode: inst.mode || 'target-min',
           timesLogged: 0,
           targetSum: 0,
           completions: 0,
           violations: 0,
           count: 0
        };
      }
      
      const t = taskTrackingMap[key];
      t.timesLogged += (inst.loggedTime || 0);
      t.targetSum += (inst.targetDuration || 0);
      t.count += 1;
      
      if (progress >= 100) t.completions += 1;
      
      if (inst.mode === 'target-max' && (inst.loggedTime || 0) > (inst.targetDuration || 0)) {
         t.violations += 1;
      }
    });

    const completionRate = tasksTotal > 0 ? Math.round(overallProgressSum / tasksTotal) : 0;

    // Consistency (days >= 70%)
    const daysWithTasks = Object.keys(daysMap).length;
    let consistentDaysCount = 0;
    
    let bestDay = { date: '-', score: -1 };
    let worstDay = { date: '-', score: 101 };

    for (const [date, data] of Object.entries(daysMap)) {
       const dailyAvg = data.count > 0 ? (data.totalProgress / data.count) : 0;
       if (dailyAvg >= 70) consistentDaysCount++;
       
       if (dailyAvg > bestDay.score) {
          bestDay = { date, score: Math.round(dailyAvg) };
       }
       if (dailyAvg < worstDay.score) {
          worstDay = { date, score: Math.round(dailyAvg) };
       }
    }
    
    // Fallback best/worst
    if (bestDay.score === -1) bestDay = { date: '-', score: 0 };
    if (worstDay.score === 101) worstDay = { date: '-', score: 0 };

    const consistency = daysWithTasks > 0 ? Math.round((consistentDaysCount / daysWithTasks) * 100) : 0;

    // Category format
    const categoryBreakdown = Object.entries(categoryMap).map(([name, data]) => {
      const percentage = totalTime > 0 ? Math.round((data.time / totalTime) * 100) : 0;
      return { name, time: data.time, percentage };
    }).sort((a, b) => b.time - a.time);

    // Performance format
    const taskStats = Object.values(taskTrackingMap).map(t => {
       const successRate = t.count > 0 ? Math.round((t.completions / t.count) * 100) : 0;
       return { ...t, successRate };
    });

    // Violations
    const violations = taskStats.filter(t => t.mode === 'target-max' && t.violations > 0).sort((a,b) => b.violations - a.violations);

    return NextResponse.json({ 
      success: true, 
      data: {
        totalTime,
        completionRate,
        tasksCompleted,
        tasksTotal,
        consistency,
        categoryBreakdown,
        taskStats,
        violations,
        bestDay,
        worstDay
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
