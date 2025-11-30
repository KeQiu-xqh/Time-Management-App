import React from 'react';
import { Task } from '../types';
import { TaskCard } from './TaskCard';
import { LayoutList, CalendarClock, Inbox } from 'lucide-react';

interface BacklogViewProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onQuickAdd: (id: string) => void;
  onEditTask: (task: Task) => void;
}

export const BacklogView: React.FC<BacklogViewProps> = ({ tasks, onToggleTask, onQuickAdd, onEditTask }) => {
  // 1. Filter all incomplete tasks
  const incompleteTasks = tasks.filter(t => !t.isCompleted);

  // 2. Unscheduled Pool (No doDate)
  // Logic: Show tasks without a date.
  // Sort: Reverse chronological (Newest created tasks on top)
  // Assuming the `tasks` array order roughly reflects creation order (appended).
  const unscheduledTasks = [...incompleteTasks]
    .filter(t => !t.doDate)
    .reverse();

  // 3. Scheduled List (Has doDate)
  // Logic: Show tasks with a date.
  // Sort: Chronological (Earliest date on top)
  const scheduledTasks = incompleteTasks
    .filter(t => t.doDate)
    .sort((a, b) => {
        const dateA = new Date(a.doDate!).getTime();
        const dateB = new Date(b.doDate!).getTime();
        return dateA - dateB;
    });

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-app-bg/95 backdrop-blur-sm z-40 pt-8 pb-4 px-8 border-b border-gray-100/50">
        <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl">
                <LayoutList size={28} />
            </div>
            <div>
                <h2 className="text-3xl font-bold text-gray-800">任务总览</h2>
                <p className="text-gray-400 font-medium">统一管理所有未完成的事项。</p>
            </div>
        </div>
      </div>

      <div className="px-8 pt-8 max-w-5xl grid grid-cols-1 gap-10">
        
        {/* Section 1: Unscheduled Pool */}
        <section className="animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4 sticky top-32 z-30">
                <div className="bg-gray-100 p-1.5 rounded-lg text-gray-500">
                    <Inbox size={18} />
                </div>
                <h3 className="text-lg font-bold text-gray-700">待办池 <span className="text-sm font-normal text-gray-400 ml-1">(未安排日期)</span></h3>
                <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">{unscheduledTasks.length}</span>
            </div>
            
            {unscheduledTasks.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-gray-200 rounded-2xl text-center flex flex-col items-center">
                    <Inbox size={48} className="text-gray-200 mb-2" />
                    <p className="text-gray-400 font-medium">待办池空空如也</p>
                    <p className="text-xs text-gray-400 mt-1">去添加一些新灵感吧！</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {unscheduledTasks.map(task => (
                        <TaskCard 
                            key={task.id} 
                            task={task} 
                            onToggle={onToggleTask} 
                            onQuickAdd={onQuickAdd} // Keep Quick Add for unscheduled
                            onClick={onEditTask}
                        />
                    ))}
                </div>
            )}
        </section>

        {/* Section 2: Scheduled List */}
        <section className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2 mb-4">
                <div className="bg-indigo-50 p-1.5 rounded-lg text-indigo-500">
                    <CalendarClock size={18} />
                </div>
                <h3 className="text-lg font-bold text-gray-700">接下来的计划 <span className="text-sm font-normal text-gray-400 ml-1">(按时间排序)</span></h3>
                <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-xs font-bold">{scheduledTasks.length}</span>
            </div>

            {scheduledTasks.length === 0 ? (
                <div className="py-8 bg-gray-50 rounded-2xl text-center text-gray-400 text-sm font-medium">
                    没有即将到来的任务
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {scheduledTasks.map(task => (
                        <TaskCard 
                            key={task.id} 
                            task={task} 
                            onToggle={onToggleTask} 
                            onClick={onEditTask}
                            // Note: Removed onQuickAdd here to prevent accidental rescheduling of future plans
                        />
                    ))}
                </div>
            )}
        </section>

      </div>
    </div>
  );
};