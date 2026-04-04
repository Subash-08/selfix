import { Types } from "mongoose";

// Utility type for Mongoose ObjectId fields
export type ObjectId = Types.ObjectId | string;

export interface IUser {
  _id?: ObjectId;
  email: string;
  name: string;
  password?: string;
  avatar?: string;
  provider: "credentials" | "google";
  role: "user" | "admin";
  timezone: string;
  locale: string;
  currency: string;
  weekStartsOn: number;
  emailVerified: boolean;
  verificationToken?: string;
  verificationTokenExpiry?: Date;
  resetToken?: string;
  resetTokenExpiry?: Date;
  aiSettings?: {
    style?: string;
    preferredTone?: string;
    geminiKey?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMoneyEntry {
  _id?: ObjectId;
  userId: ObjectId;
  date: Date;
  amount: number;
  type: "expense" | "income";
  paymentMode: "cash" | "upi" | "card" | "bank";
  category: string;
  subcategory?: string;
  note?: string;
  isRecurring: boolean;
  recurringId?: ObjectId;
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDayBalance {
  _id?: ObjectId;
  userId: ObjectId;
  date: Date;
  openingCash: number;
  openingUPI: number;
  closingCashActual: number | null;
  closingUPIActual: number | null;
  carryForward: boolean;
  note?: string;
  tallyNote?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRecurringExpense {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  amount: number;
  category: string;
  paymentMode: string;
  frequency: "daily" | "weekly" | "monthly";
  dayOfMonth?: number;
  active: boolean;
}

export interface IBudget {
  _id?: ObjectId;
  userId: ObjectId;
  month: string; // YYYY-MM
  category: string;
  amount: number;
}

export interface ISavingsGoal {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
  category?: string;
  completed: boolean;
  archived: boolean;
}

export interface IHabit {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  description?: string;
  type: "build" | "quit";
  frequency: {
    type: "daily" | "weekly" | "custom";
    daysOfWeek?: number[];
    timesPerWeek?: number;
  };
  category: string;
  color: string;
  icon: string;
  stackGroup?: string;
  active: boolean;
  createdAt?: Date;
  archivedAt?: Date;
}

export interface IHabitCheckin {
  _id?: ObjectId;
  userId: ObjectId;
  habitId: ObjectId;
  date: Date;
  completed: boolean;
  note?: string;
  skipped: boolean;
  completedAt?: Date;
}

export interface IActivityEntry {
  _id?: ObjectId;
  userId: ObjectId;
  date: Date;
  name: string;
  category: string;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  isPlanned: boolean;
  completedActual: boolean;
  pomodoroSessions: number;
  notes?: string;
  tags: string[];
}

export interface IPomodoroSession {
  _id?: ObjectId;
  userId: ObjectId;
  activityId?: ObjectId;
  startedAt: Date;
  endedAt?: Date;
  duration: number;
  breakDuration: number;
  completed: boolean;
}

export interface IMobileAppUsage {
  _id?: ObjectId;
  userId: ObjectId;
  date: Date;
  appName: string;
  usageMinutes: number;
  goalMinutes: number;
  withinGoal: boolean;
}

export interface IJournalEntry {
  _id?: ObjectId;
  userId: ObjectId;
  date: Date;
  rawNotes: string;
  expandedContent?: string;
  mood: 1 | 2 | 3 | 4 | 5;
  moodEmoji: string;
  moodNote?: string;
  gratitude: string[];
  promptAnswers?: {
    wentWell?: string;
    drained?: string;
    tomorrow?: string;
  };
  photos: string[];
  tags: string[];
  aiGenerated: boolean;
  wordCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IGoalMilestone {
  _id?: ObjectId;
  title: string;
  completed: boolean;
  completedAt?: Date;
  order: number;
}

export interface IGoal {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  description?: string;
  category: "career" | "health" | "finance" | "relationships" | "learning" | "personal";
  deadline?: Date;
  status: "active" | "completed" | "archived";
  milestones: IGoalMilestone[];
  tags: string[];
  aiSuggested: boolean;
  templateId?: string;
  createdAt?: Date;
}

export interface IHealthLog {
  _id?: ObjectId;
  userId: ObjectId;
  date: Date;
  water: { logged: number; goal: number };
  sleep: { bedtime?: string; wakeTime?: string; quality?: 1 | 2 | 3 | 4 | 5; durationMinutes?: number };
  workout: { type: string; duration: number; sets?: number; reps?: number; weight?: number; notes?: string }[];
  steps: { count: number; goal: number };
  calories: { consumed: number; goal: number };
  meals: { name: string; calories: number; protein?: number; carbs?: number; fat?: number; time?: string }[];
  bodyMetrics?: { weight?: number; unit: "kg" | "lbs" };
}

export interface IStreak {
  _id?: ObjectId;
  userId: ObjectId;
  entityType: "habit" | "journal" | "activity" | "money" | "water" | "sleep" | "workout";
  entityId?: ObjectId;
  currentStreak: number;
  longestStreak: number;
  lastCheckinDate?: Date;
  freezesUsedThisMonth: number;
}
