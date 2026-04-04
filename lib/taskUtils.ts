import { subDays, addDays, parseISO, format, differenceInDays } from "date-fns";
import { TaskTemplate } from "@/models/TaskTemplate";
import { TaskInstance } from "@/models/TaskInstance";

function formatDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function generateRecurrenceDates(recurrence: any, start: Date, end: Date): string[] {
  const dates: string[] = [];
  let current = new Date(start);
  
  while (current <= end) {
    let include = false;
    
    if (recurrence.type === "daily") {
      include = true;
    } else if (recurrence.type === "weekdays") {
      const day = current.getDay();
      if (recurrence.weekdays.includes(day)) {
        include = true;
      }
    } else if (recurrence.type === "custom") {
      // Very basic approach: just every N days from epoch (or could use task createdAt)
      // Usually you'd track the start date. For simplicity, we just modulo diff.
      // Better approach: calculate difference from start of time or creation date.
      const diff = differenceInDays(current, new Date(0));
      if (diff % (recurrence.interval || 1) === 0) {
        // Warning: This means "every N days" alignment is fixed globally. 
        // Typically it's relative to the start date. Let's do it relative to current start.
        include = true;
      }
    }

    if (include) {
      dates.push(formatDate(current));
    }
    
    current = addDays(current, 1);
  }
  
  return dates;
}

export async function ensureInstancesForDate(userId: string, targetDate: string) {
  const start = subDays(parseISO(targetDate), 7);
  const end = addDays(parseISO(targetDate), 7);
  
  // Get all active tasks
  const tasks = await TaskTemplate.find({ userId, active: true, isDeleted: false });
  
  for (const task of tasks) {
    const existingDates = await TaskInstance.distinct("date", {
      userId,
      taskId: task._id,
      date: { $gte: formatDate(start), $lte: formatDate(end) }
    });
    
    const missingDates = generateRecurrenceDates(task.recurrence, start, end)
      .filter((date) => !existingDates.includes(date));
      
    if (missingDates.length > 0) {
      await TaskInstance.insertMany(
        missingDates.map((date) => ({
          userId,
          taskId: task._id,
          date,
          targetDuration: task.targetDuration,
          loggedTime: 0,
          progress: 0,
          status: "not_started"
        }))
      );
    }
  }
}

export function doesDayQualifyForStreak(instances: any[]): boolean {
  if (instances.length === 0) return false;
  
  const avgProgress = instances.reduce((sum, t) => sum + (t.progress || 0), 0) / instances.length;
  const hasOneComplete = instances.some((t) => t.progress >= 100);
  
  return avgProgress >= 70 && hasOneComplete;
}
