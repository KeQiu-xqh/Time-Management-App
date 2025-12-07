
export enum Tab {
  Backlog = 'backlog',
  Calendar = 'calendar',
  Habits = 'habits',
  Categories = 'categories',
}

export interface Category {
  id: string;
  name: string;
  colorBg: string; // Tailwind class, e.g., 'bg-purple-100'
  colorText: string; // Tailwind class, e.g., 'text-purple-600'
}

export type RepeatFrequency = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  category?: Category;
  doDate?: Date; // Optional: If undefined, it's in the Backlog
  deadline?: Date; // The hard deadline
  repeat?: RepeatFrequency; // 'none', 'daily', 'weekly', 'monthly'
  
  // New Time Fields
  startTime?: string; // "HH:MM", e.g. "14:30"
  duration?: number; // in minutes, default 30

  // UI-Only fields for mixed views (Habits as Tasks)
  isHabit?: boolean;
  streak?: number;
  
  // Link back to original habit if this is a scheduled instance
  originalHabitId?: string;
}

export interface Habit {
  id: string;
  title: string;
  category?: Category; // Added category association
  frequency?: 'daily' | 'weekly'; // New field for habit frequency
  defaultTime?: string; // Optional: Default time for the habit (e.g., "07:00")
  completedDates: string[]; // ISO Date strings "YYYY-MM-DD"
  streak: number;
}
