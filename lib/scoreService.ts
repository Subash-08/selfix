export interface ScoreInputs {
  habitScore: number;
  activityScore: number;
  budgetScore: number;
  healthScore: number;
  journalWritten: boolean;
}

export function computeDailyScore({
  habitScore,
  activityScore,
  budgetScore,
  healthScore,
  journalWritten,
}: ScoreInputs): number {
  return Math.round(
    habitScore * 0.30 +
    activityScore * 0.25 +
    budgetScore * 0.20 +
    healthScore * 0.15 +
    (journalWritten ? 100 : 0) * 0.10
  )
}

export function computeHabitScore(completed: number, total: number): number {
  if (total === 0) return 100
  return Math.round((completed / total) * 100)
}

export function computeBudgetScore(spent: number, budget: number): number {
  if (budget === 0) return 100
  const ratio = spent / budget
  if (ratio <= 1) return Math.round((1 - ratio) * 100)
  return 0
}

export function computeGoalProgress(completedMilestones: number, totalMilestones: number): number {
  if (totalMilestones === 0) return 0
  return Math.round((completedMilestones / totalMilestones) * 100)
}
