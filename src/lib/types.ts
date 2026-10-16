export const EXPENSE_CATEGORIES = [
  "餐饮",
  "交通",
  "购物",
  "娱乐",
  "学习",
  "其他",
] as const;
export const MEAL_TYPES = ["早餐", "午餐", "晚餐", "加餐"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type MealType = (typeof MEAL_TYPES)[number];
export type PageId =
  | "dashboard"
  | "tasks"
  | "expenses"
  | "study"
  | "weight"
  | "diet"
  | "analytics"
  | "settings";
export interface Task {
  id: string;
  title: string;
  date: string;
  completed: boolean;
}
export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  time: string;
  note: string;
}
export interface Study {
  id: string;
  content: string;
  topic: string;
  minutes: number;
  date: string;
  note: string;
}
export interface Weight {
  id: string;
  date: string;
  value: number;
}
export interface Meal {
  id: string;
  date: string;
  type: MealType;
  food: string;
  quantity: string;
  calories: number;
  note: string;
}
export interface Settings {
  name: string;
  targetWeight: number | null;
  dailyStudyGoal: number;
  dailyCalorieGoal: number;
}
export interface AppData {
  version: 1;
  tasks: Task[];
  expenses: Expense[];
  studies: Study[];
  weights: Weight[];
  meals: Meal[];
  settings: Settings;
}
export type UpdateData = (updater: (current: AppData) => AppData) => void;
export interface PageProps {
  data: AppData;
  update: UpdateData;
  notify: (message: string) => void;
  navigate: (page: PageId) => void;
}
