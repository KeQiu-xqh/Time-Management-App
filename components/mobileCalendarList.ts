import { Task } from '../types';
import { dateKey, timeMinutes } from './calendarGesture';

export interface MobileCalendarTaskGroup {
  date: Date;
  tasks: Task[];
}

export function calendarTasksForDate(tasks: Task[], date: Date): Task[] {
  const target = dateKey(date);
  return tasks
    .filter(task => task.doDate && dateKey(new Date(task.doDate)) === target)
    .map((task, index) => ({ task, index }))
    .sort((a, b) => {
      const aOrder = a.task.startTime ? timeMinutes(a.task.startTime) + 1 : 0;
      const bOrder = b.task.startTime ? timeMinutes(b.task.startTime) + 1 : 0;
      return aOrder - bOrder || a.index - b.index;
    })
    .map(item => item.task);
}

export function calendarTaskGroups(tasks: Task[], days: Date[]): MobileCalendarTaskGroup[] {
  return days.map(date => ({ date, tasks: calendarTasksForDate(tasks, date) }));
}
