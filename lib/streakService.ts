import { subDays, isSameDay, startOfDay } from 'date-fns'
import Streak from '@/models/Streak'

export async function updateStreak(
  userId: string,
  entityType: string,
  entityId?: string,
  date: Date = new Date()
) {
  const query = { userId, entityType, ...(entityId && { entityId }) }
  const streak = await Streak.findOne(query) || new Streak(query)
  const today = startOfDay(date)
  const yesterday = subDays(today, 1)
  
  if (!streak.lastCheckinDate) {
    streak.currentStreak = 1
  } else if (isSameDay(streak.lastCheckinDate, today)) {
    // already checked in today, no change
  } else if (isSameDay(streak.lastCheckinDate, yesterday)) {
    streak.currentStreak += 1
  } else {
    streak.currentStreak = 1  // streak broken, restart
  }
  
  streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak)
  streak.lastCheckinDate = today
  await streak.save()
  return streak
}

export async function freezeStreak(userId: string, entityType: string, entityId?: string) {
  const query = { userId, entityType, ...(entityId && { entityId }) }
  const streak = await Streak.findOne(query)
  if (!streak) return null
  if (streak.freezesUsedThisMonth >= 1) throw new Error('Freeze limit reached for this month')
  streak.freezesUsedThisMonth += 1
  // Extend lastCheckinDate to today so streak continues
  streak.lastCheckinDate = startOfDay(new Date())
  await streak.save()
  return streak
}
