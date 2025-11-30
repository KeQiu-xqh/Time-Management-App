
import { Task, Category, Habit } from './types';

export const CATEGORY_COLORS = [
  { bg: 'bg-pink-100', text: 'text-pink-500' },
  { bg: 'bg-blue-100', text: 'text-blue-500' },
  { bg: 'bg-amber-100', text: 'text-amber-600' },
  { bg: 'bg-green-100', text: 'text-green-600' },
  { bg: 'bg-gray-100', text: 'text-gray-600' },
  { bg: 'bg-red-100', text: 'text-red-500' },
  { bg: 'bg-purple-100', text: 'text-purple-500' },
  { bg: 'bg-teal-100', text: 'text-teal-600' },
  { bg: 'bg-indigo-100', text: 'text-indigo-500' },
];

export const INITIAL_CATEGORIES: Record<string, Category> = {
  PHYSICS: { id: 'c1', name: '量子力学', colorBg: 'bg-pink-100', colorText: 'text-pink-500' },
  ELECTRONICS: { id: 'c2', name: '现代电子', colorBg: 'bg-blue-100', colorText: 'text-blue-500' },
  COMPUTING: { id: 'c3', name: '计算物理', colorBg: 'bg-amber-100', colorText: 'text-amber-600' },
  WORK: { id: 'c4', name: '课程作业', colorBg: 'bg-green-100', colorText: 'text-green-600' },
  LIFE: { id: 'c5', name: '生活杂务', colorBg: 'bg-gray-100', colorText: 'text-gray-600' },
};

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

export const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    title: '背单词',
    isCompleted: false,
    doDate: today,
    repeat: 'daily',
    category: INITIAL_CATEGORIES.LIFE,
  },
  {
    id: 't2',
    title: '第一章习题整理',
    isCompleted: false,
    category: INITIAL_CATEGORIES.PHYSICS,
    doDate: yesterday, // Overdue relative to doDate
    deadline: yesterday, // Actually overdue
  },
  {
    id: 't3',
    title: '实验报告撰写',
    isCompleted: false,
    category: INITIAL_CATEGORIES.ELECTRONICS,
    doDate: today,
    deadline: tomorrow, // Due soon
  },
  {
    id: 't4',
    title: '复习线性代数',
    isCompleted: true,
    doDate: today,
  },
  {
    id: 't5',
    title: '期末项目选题',
    isCompleted: false,
    category: INITIAL_CATEGORIES.COMPUTING,
    doDate: today,
    deadline: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5),
  },
  // Backlog items (no doDate)
  {
    id: 'b1',
    title: '阅读《费曼物理学讲义》第三卷',
    isCompleted: false,
    category: INITIAL_CATEGORIES.PHYSICS,
  },
  {
    id: 'b2',
    title: '整理电脑桌面文件',
    isCompleted: false,
    category: INITIAL_CATEGORIES.LIFE,
  },
  {
    id: 'b3',
    title: '学习 React Server Components',
    isCompleted: false,
    category: INITIAL_CATEGORIES.COMPUTING,
    deadline: new Date(today.getFullYear(), today.getMonth() + 1, 1),
  }
];

export const MOCK_HABITS: Habit[] = [
  {
    id: 'h1',
    title: '早起 (7:00 AM)',
    category: INITIAL_CATEGORIES.LIFE,
    frequency: 'daily',
    completedDates: [
      new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
      new Date(Date.now() - 172800000).toISOString().split('T')[0], // Day before
    ],
    streak: 2
  },
  {
    id: 'h2',
    title: '阅读 30 分钟',
    category: INITIAL_CATEGORIES.PHYSICS,
    frequency: 'daily',
    completedDates: [],
    streak: 0
  },
  {
    id: 'h3',
    title: '喝水 2L',
    category: INITIAL_CATEGORIES.LIFE,
    frequency: 'daily',
    completedDates: [
       new Date().toISOString().split('T')[0] // Today
    ],
    streak: 1
  }
];
