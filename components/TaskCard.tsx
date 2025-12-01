
import React from 'react';
import { Task } from '../types';
import { Circle, CheckCircle2, RotateCw, AlertCircle, Zap, Flame } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onQuickAdd?: (id: string) => void;
  onClick?: (task: Task) => void;
  variant?: 'default' | 'compact';
}

const formatDate = (date: Date): string => {
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const isOverdue = (date?: Date): boolean => {
  if (!date) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return target < now;
};

const isToday = (date?: Date): boolean => {
  if (!date) return false;
  const now = new Date();
  return date.getDate() === now.getDate() && 
         date.getMonth() === now.getMonth() && 
         date.getFullYear() === now.getFullYear();
};

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onToggle, 
  onQuickAdd, 
  onClick,
  variant = 'default'
}) => {
  const isCompact = variant === 'compact';
  const isDeadlineOverdue = isOverdue(task.deadline);
  const isDoDateToday = isToday(task.doDate);
  
  // Format doDate display
  let dateDisplay = "";
  if (task.doDate) {
    dateDisplay = formatDate(task.doDate);
    if (isDoDateToday) dateDisplay = "今天";
    else if (isOverdue(task.doDate)) dateDisplay = "昨天";
  } else {
    dateDisplay = "待办";
  }

  // Visual identifier for Habit
  const isHabit = task.isHabit;

  // --- Compact View (for Week Grid) ---
  if (isCompact) {
    return (
      <div 
        onClick={() => onClick && onClick(task)}
        className={`bg-white rounded-xl p-3 shadow-sm border border-transparent hover:border-indigo-50 group relative cursor-pointer mb-2 transition-all ${task.isCompleted ? 'opacity-50 grayscale' : 'hover:shadow-md'}`}
      >
         <div className="flex items-start gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggle(task.id);
              }}
              className={`mt-0.5 flex-shrink-0 transition-colors ${task.isCompleted ? (isHabit ? 'text-orange-500' : 'text-app-primary') : 'text-gray-300 hover:text-app-primary'}`}
            >
              {task.isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} strokeWidth={2} />}
            </button>
            <div className="min-w-0 flex-1">
                 {/* Category Color Strip (Habits get implicit color if not set) */}
                 {!isHabit && task.category && (
                    <div className={`w-6 h-1 rounded-full mb-1.5 ${task.category.colorBg}`}></div>
                 )}
                 {isHabit && (
                    <div className="w-6 h-1 rounded-full mb-1.5 bg-orange-200"></div>
                 )}
                 
                 <h3 className={`text-xs font-bold leading-snug break-words ${task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                    {task.title}
                 </h3>
            </div>
         </div>
      </div>
    );
  }

  // --- Default View ---
  return (
    <div 
      onClick={() => onClick && onClick(task)}
      className={`bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-start gap-4 transition-all duration-200 group relative cursor-pointer 
        ${isHabit ? 'border-l-4 border-l-orange-400 border-y border-r border-transparent' : 'border border-transparent hover:border-indigo-50'}`}
    >
      {/* Checkbox Area */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task.id);
        }}
        className={`mt-0.5 flex-shrink-0 text-gray-300 hover:text-app-primary transition-colors ${task.isCompleted ? (isHabit ? 'text-orange-500' : 'text-app-primary') : ''}`}
      >
        {task.isCompleted ? (
          <CheckCircle2 size={24} className={isHabit ? 'text-orange-500' : 'text-app-primary'} />
        ) : (
          <Circle size={24} strokeWidth={2} />
        )}
      </button>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          {/* Date Label (Hide for habits as they are daily) */}
          {!isHabit && (
            <span className={`text-xs font-bold ${isOverdue(task.doDate) && !task.isCompleted ? 'text-red-400' : 'text-gray-400'}`}>
                {dateDisplay}
            </span>
          )}

          {/* Category Tag (Only for non-habits) */}
          {!isHabit && task.category && (
            <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide ${task.category.colorBg} ${task.category.colorText}`}>
              {task.category.name}
            </span>
          )}
          
          {/* Habit Tag (New Style) */}
          {isHabit && (
             <span className="px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide bg-orange-50 border border-orange-100 flex items-center gap-1.5">
                 {task.category && (
                    <div className={`w-1.5 h-1.5 rounded-full ${task.category.colorText.replace('text-', 'bg-')}`}></div>
                 )}
                 <div className="flex items-center gap-0.5 text-orange-600">
                    <Flame size={12} fill="currentColor" /> 
                    <span>{task.streak || 0}</span>
                 </div>
             </span>
          )}

          {/* Recurring Icon */}
          {task.repeat && task.repeat !== 'none' && !isHabit && (
            <div className="flex items-center gap-0.5 text-gray-400" title={`重复: ${task.repeat}`}>
              <RotateCw size={12} />
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className={`text-[17px] font-bold leading-snug mb-2 ${task.isCompleted ? 'text-gray-300 line-through' : 'text-gray-800'}`}>
          {task.title}
        </h3>

        {/* Deadline & Overdue Warning (Only for Tasks) */}
        {!isHabit && (task.deadline) && !task.isCompleted && (
          <div className="flex justify-start">
            <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors ${
              isDeadlineOverdue 
                ? 'bg-red-50 text-red-500' 
                : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100'
            }`}>
              {isDeadlineOverdue ? <AlertCircle size={12} /> : <span className="w-1 h-1 rounded-full bg-gray-400"></span>}
              <span>
                {isDeadlineOverdue ? '已逾期' : '截止:'} {formatDate(task.deadline)}
              </span>
            </div>
          </div>
        )}
        
        {/* Habit Encouragement */}
        {isHabit && !task.isCompleted && (
            <div className="text-[10px] text-gray-400 font-medium">
                坚持就是胜利！
            </div>
        )}
      </div>

      {/* Quick Plan Button (Backlog Only) - Stop Propagation */}
      {onQuickAdd && !task.isCompleted && !isHabit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickAdd(task.id);
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all p-2 bg-indigo-50 text-app-primary rounded-xl hover:bg-app-primary hover:text-white hover:scale-110 shadow-sm"
          title="安排到今天"
        >
          <Zap size={18} fill="currentColor" />
        </button>
      )}
    </div>
  );
};
