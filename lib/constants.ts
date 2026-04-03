// ─── Money Categories ──────────────────────────────────────────
export const MONEY_CATEGORIES = [
  { id: 'food', label: 'Food & Dining', icon: 'Utensils', color: '#f59e0b' },
  { id: 'transport', label: 'Transport', icon: 'Car', color: '#3b82f6' },
  { id: 'shopping', label: 'Shopping', icon: 'ShoppingBag', color: '#ec4899' },
  { id: 'bills', label: 'Bills & Utilities', icon: 'Zap', color: '#8b5cf6' },
  { id: 'health', label: 'Health', icon: 'Heart', color: '#ef4444' },
  { id: 'entertainment', label: 'Entertainment', icon: 'Film', color: '#06b6d4' },
  { id: 'education', label: 'Education', icon: 'BookOpen', color: '#10b981' },
  { id: 'personal', label: 'Personal Care', icon: 'Sparkles', color: '#f472b6' },
  { id: 'family', label: 'Family', icon: 'Users', color: '#fb923c' },
  { id: 'savings', label: 'Savings', icon: 'PiggyBank', color: '#22c55e' },
  { id: 'investment', label: 'Investment', icon: 'TrendingUp', color: '#6366f1' },
  { id: 'salary', label: 'Salary', icon: 'Briefcase', color: '#22c55e' },
  { id: 'freelance', label: 'Freelance', icon: 'Laptop', color: '#10b981' },
  { id: 'business', label: 'Business', icon: 'Building2', color: '#14b8a6' },
  { id: 'rent', label: 'Rent', icon: 'Home', color: '#a855f7' },
  { id: 'other', label: 'Other', icon: 'Package', color: '#6b7280' },
] as const;

export const PAYMENT_MODES = [
  { id: 'cash', label: 'Cash', icon: 'Banknote' },
  { id: 'upi', label: 'UPI', icon: 'Smartphone' },
  { id: 'card', label: 'Card', icon: 'CreditCard' },
  { id: 'bank', label: 'Bank', icon: 'Landmark' },
] as const;

// ─── Activity Categories ───────────────────────────────────────
export const ACTIVITY_CATEGORIES = [
  { id: 'work', label: 'Work', color: '#6c63ff', icon: '💼' },
  { id: 'study', label: 'Study', color: '#3b82f6', icon: '📖' },
  { id: 'exercise', label: 'Exercise', color: '#22c55e', icon: '🏃' },
  { id: 'personal', label: 'Personal', color: '#f59e0b', icon: '🧘' },
  { id: 'leisure', label: 'Leisure', color: '#ec4899', icon: '🎮' },
  { id: 'social', label: 'Social', color: '#14b8a6', icon: '👥' },
  { id: 'health', label: 'Health', color: '#ef4444', icon: '🏥' },
  { id: 'other', label: 'Other', color: '#6b7280', icon: '📦' },
] as const;

// ─── Habit Helpers ─────────────────────────────────────────────
export const HABIT_ICONS = [
  '📚', '💧', '🧘', '🏃', '✍️', '🎵', '🍎', '💪',
  '🧠', '🛌', '🚶', '🎯', '🌱', '☀️', '🧹', '💊',
  '📝', '🎨', '🏋️', '🧘‍♀️', '🚴', '🏊', '🤸', '🧗',
] as const;

export const HABIT_COLORS = [
  '#6c63ff', '#3b82f6', '#22c55e', '#f59e0b',
  '#ec4899', '#14b8a6', '#ef4444', '#8b5cf6',
] as const;

export const HABIT_STACK_GROUPS = [
  { id: 'morning', label: 'Morning 🌅' },
  { id: 'afternoon', label: 'Afternoon ☀️' },
  { id: 'evening', label: 'Evening 🌙' },
  { id: 'anytime', label: 'Anytime ⏰' },
] as const;

// ─── Goal Templates ────────────────────────────────────────────
export const GOAL_TEMPLATES = [
  {
    id: '30day',
    title: '30-Day Challenge',
    description: 'Commit to a habit or skill for 30 consecutive days',
    category: 'personal' as const,
    milestones: Array.from({ length: 30 }, (_, i) => ({
      title: `Day ${i + 1}`,
      completed: false,
      order: i,
    })),
  },
  {
    id: 'reading',
    title: 'Read a Book',
    description: 'Complete a book from start to finish',
    category: 'learning' as const,
    milestones: [
      { title: 'Choose and get the book', completed: false, order: 0 },
      { title: 'Read first 25%', completed: false, order: 1 },
      { title: 'Reach halfway point', completed: false, order: 2 },
      { title: 'Read 75%', completed: false, order: 3 },
      { title: 'Finish the book', completed: false, order: 4 },
      { title: 'Write a reflection', completed: false, order: 5 },
    ],
  },
  {
    id: 'fitness',
    title: 'Fitness Milestone',
    description: 'Achieve a specific fitness target in 4 weeks',
    category: 'health' as const,
    milestones: [
      { title: 'Set specific target', completed: false, order: 0 },
      { title: 'Complete week 1', completed: false, order: 1 },
      { title: 'Complete week 2', completed: false, order: 2 },
      { title: 'Complete week 3', completed: false, order: 3 },
      { title: 'Complete week 4', completed: false, order: 4 },
      { title: 'Measure and celebrate result', completed: false, order: 5 },
    ],
  },
] as const;

// ─── Mood config ───────────────────────────────────────────────
export const MOOD_OPTIONS = [
  { value: 1, emoji: '😫', label: 'Terrible' },
  { value: 2, emoji: '😔', label: 'Bad' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '🤩', label: 'Great' },
] as const;

// ─── Workout types ─────────────────────────────────────────────
export const WORKOUT_TYPES = [
  'Running', 'Cycling', 'Gym', 'Yoga', 'Swimming', 'Walking', 'Other',
] as const;

// ─── Timezone list ─────────────────────────────────────────────
export const TIMEZONES = [
  'Asia/Kolkata', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Dubai', 'Australia/Sydney',
  'Pacific/Auckland', 'Asia/Singapore', 'Asia/Hong_Kong',
] as const;
