import type { Task, RepeatRule } from '../types';

const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const dayNumber = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
const weekStart = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

export function rescheduleTask(task: Task, date: Date, startTime?: string | null, duration?: number): Task {
  const changedDate = !task.doDate || key(new Date(task.doDate)) !== key(date);
  return {
    ...task,
    doDate: date,
    // A new execution day starts a new cycle; time-only changes retain month-end anchors.
    repeatAnchorDate: changedDate ? key(date) : task.repeatAnchorDate,
    ...(startTime !== undefined ? { startTime: startTime === null ? undefined : startTime } : {}),
    ...(duration !== undefined ? { duration } : {}),
  };
}

export function nextRepeatTask(task: Task, tasks: Task[], id = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)): Task | undefined {
  if (!task.doDate || !task.repeat || task.repeat === 'none' || tasks.some(t => t.repeatParentId === task.id)) return;
  const current = new Date(task.doDate);
  if (!Number.isFinite(current.getTime())) return;
  const rule: RepeatRule | undefined = task.repeat === 'custom' ? task.repeatRule : {
    interval: 1,
    unit: task.repeat === 'daily' ? 'day' : task.repeat === 'weekly' ? 'week' : 'month',
  };
  if (!rule || !Number.isInteger(rule.interval) || rule.interval < 1 || rule.interval > 999) return;
  const anchor = task.repeatAnchorDate ? parse(task.repeatAnchorDate) : current;
  if (!Number.isFinite(anchor.getTime())) return;
  let next: Date;
  if (rule.unit === 'day') {
    next = addDays(current, rule.interval);
  } else if (rule.unit === 'month') {
    const month = new Date(current.getFullYear(), current.getMonth() + rule.interval, 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    next = new Date(month.getFullYear(), month.getMonth(), Math.min(anchor.getDate(), lastDay));
  } else if (rule.unit === 'week') {
    const weekdays = rule.weekdays ?? [anchor.getDay()];
    if (!weekdays.length || weekdays.some(d => !Number.isInteger(d) || d < 0 || d > 6)) return;
    const anchorWeek = dayNumber(weekStart(anchor));
    let candidate = addDays(current, 1);
    // Search one repeat cycle; using local calendar days avoids DST shifts.
    for (let i = 0; i < rule.interval * 7 + 7; i++, candidate = addDays(candidate, 1)) {
      const weeks = (dayNumber(weekStart(candidate)) - anchorWeek) / 7;
      if (weeks >= 0 && weeks % rule.interval === 0 && weekdays.includes(candidate.getDay())) {
        next = candidate;
        break;
      }
    }
  } else return;
  if (!next || (rule.until && key(next) > rule.until)) return;
  const deadline = task.deadline ? addDays(new Date(task.deadline), dayNumber(next) - dayNumber(current)) : undefined;
  return { ...task, id, isCompleted: false, doDate: next, deadline,
    repeatAnchorDate: task.repeatAnchorDate || key(current), repeatParentId: task.id };
}

export function repeatLabel(task: Pick<Task, 'repeat' | 'repeatRule'>): string {
  if (task.repeat !== 'custom') return ({ daily: '每天', weekly: '每周', monthly: '每月', none: '不重复' })[task.repeat || 'none'];
  const rule = task.repeatRule;
  if (!rule) return '自定义重复';
  const unit = { day: '天', week: '周', month: '个月' }[rule.unit];
  const weekdays = rule.unit === 'week' && rule.weekdays?.length
    ? ` · ${[1, 2, 3, 4, 5, 6, 0].filter(d => rule.weekdays.includes(d)).map(d => `周${['日', '一', '二', '三', '四', '五', '六'][d]}`).join('、')}` : '';
  return `每 ${rule.interval} ${unit}${weekdays}${rule.until ? ` · 至 ${rule.until}` : ''}`;
}
