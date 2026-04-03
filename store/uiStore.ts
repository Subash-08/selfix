import { create } from 'zustand'

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info'
}

export type SheetType =
  | null
  | 'money'
  | 'money-edit'
  | 'habit'
  | 'activity'
  | 'journal'
  | 'goal'
  | 'health'
  | 'health-water'
  | 'health-sleep'
  | 'health-workout'

interface UIStore {
  // Toasts
  toasts: Toast[];
  addToast: (t: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // Theme
  theme: 'dark' | 'light' | 'system';
  setTheme: (t: UIStore['theme']) => void;

  // Unified sheet system
  activeSheet: SheetType;
  openSheet: (sheet: SheetType) => void;
  closeSheet: () => void;

  // Legacy compat helpers (BottomSheet components already import these)
  isAddMoneyOpen: boolean;
  setAddMoneyOpen: (val: boolean) => void;
  isAddHabitOpen: boolean;
  setAddHabitOpen: (val: boolean) => void;
  isAddJournalOpen: boolean;
  setAddJournalOpen: (val: boolean) => void;
  isAddGoalOpen: boolean;
  setAddGoalOpen: (val: boolean) => void;
  isAddHealthOpen: boolean;
  setAddHealthOpen: (val: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // Toasts
  toasts: [],
  addToast: (t) => set((state) => ({
    toasts: [...state.toasts, { ...t, id: crypto.randomUUID() }]
  })),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  })),

  // Theme
  theme: 'dark',
  setTheme: (theme) => set({ theme }),

  // Unified sheet
  activeSheet: null,
  openSheet: (sheet) => set({ activeSheet: sheet }),
  closeSheet: () => set({ activeSheet: null }),

  // Legacy compat — these call through to activeSheet
  get isAddMoneyOpen() { return false },
  setAddMoneyOpen: (val) => set({ activeSheet: val ? 'money' : null }),
  get isAddHabitOpen() { return false },
  setAddHabitOpen: (val) => set({ activeSheet: val ? 'habit' : null }),
  get isAddJournalOpen() { return false },
  setAddJournalOpen: (val) => set({ activeSheet: val ? 'journal' : null }),
  get isAddGoalOpen() { return false },
  setAddGoalOpen: (val) => set({ activeSheet: val ? 'goal' : null }),
  get isAddHealthOpen() { return false },
  setAddHealthOpen: (val) => set({ activeSheet: val ? 'health' : null }),
}))
