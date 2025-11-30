
import React, { useState } from 'react';
import { Habit, Category } from '../types';
import { HabitCard, HabitViewMode } from './HabitCard';
import { CheckSquare, Plus, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface HabitsViewProps {
  habits: Habit[];
  categories: Record<string, Category>;
  onToggleHabit: (id: string, dateStr: string) => void;
  onOpenCreator: () => void; // Trigger global modal
  onEditHabit: (habit: Habit) => void;
}

export const HabitsView: React.FC<HabitsViewProps> = ({ habits, categories, onToggleHabit, onOpenCreator, onEditHabit }) => {
  const [viewMode, setViewMode] = useState<HabitViewMode>('week');
  const [viewDate, setViewDate] = useState(new Date());

  // --- Navigation Logic ---
  const handlePrev = () => {
    const newDate = new Date(viewDate);
    if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
    if (viewMode === 'month') newDate.setMonth(newDate.getMonth() - 1);
    if (viewMode === 'year') newDate.setFullYear(newDate.getFullYear() - 1);
    setViewDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(viewDate);
    if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
    if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + 1);
    if (viewMode === 'year') newDate.setFullYear(newDate.getFullYear() + 1);
    setViewDate(newDate);
  };

  const handleToday = () => {
    setViewDate(new Date());
  };

  // --- Label Logic ---
  const getDateRangeLabel = () => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth() + 1;
    
    if (viewMode === 'year') {
      return `${y}年`;
    }
    
    if (viewMode === 'month') {
      return `${y}年 ${m}月`;
    }
    
    if (viewMode === 'week') {
      // Find Sunday (Start of Week)
      const start = new Date(viewDate);
      start.setDate(viewDate.getDate() - viewDate.getDay()); // 0 is Sunday
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      
      const startStr = `${start.getMonth() + 1}月${start.getDate()}日`;
      const endStr = `${end.getMonth() + 1}月${end.getDate()}日`;
      return `${startStr} - ${endStr}`;
    }
    return '';
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-app-bg/95 backdrop-blur-sm z-40 pt-8 pb-4 px-8 border-b border-gray-100/50">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-4">
           {/* Left: Title */}
           <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 text-app-primary rounded-2xl">
                    <CheckSquare size={28} />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">习惯打卡</h2>
                    <p className="text-gray-400 font-medium hidden md:block">每天进步 1%，一年强 37 倍。</p>
                </div>
           </div>
           
           {/* Right: View Switcher & Add Button */}
           <div className="flex items-center gap-4">
              {/* Segmented Control */}
              <div className="bg-gray-100 p-1 rounded-xl flex font-bold text-sm">
                  {(['week', 'month', 'year'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                            setViewMode(mode);
                            setViewDate(new Date()); // Reset date when switching view for clarity
                        }}
                        className={`px-4 py-1.5 rounded-lg transition-all ${
                            viewMode === mode 
                                ? 'bg-white text-app-primary shadow-sm' 
                                : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {mode === 'week' ? '周' : mode === 'month' ? '月' : '年'}
                      </button>
                  ))}
              </div>

              <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>

              <button 
                  onClick={onOpenCreator}
                  className="flex items-center gap-2 bg-app-primary text-white px-5 py-2 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95"
              >
                  <Plus size={18} strokeWidth={3} />
                  <span className="font-bold text-sm hidden sm:inline">新建习惯</span>
                  <span className="font-bold text-sm sm:hidden">新建</span>
              </button>
           </div>
        </div>

        {/* Date Navigation Bar */}
        <div className="flex items-center justify-between bg-white rounded-xl p-2 shadow-sm border border-gray-100 max-w-md">
            <button 
                onClick={handlePrev}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
                <ChevronLeft size={20} />
            </button>
            
            <div className="font-bold text-gray-700 text-sm tracking-wide">
                {getDateRangeLabel()}
            </div>

            <div className="flex items-center gap-1">
                <button 
                    onClick={handleNext}
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                    <ChevronRight size={20} />
                </button>
                <div className="w-px h-4 bg-gray-200 mx-1"></div>
                <button 
                    onClick={handleToday}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-app-primary bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                    <Calendar size={14} />
                    今天
                </button>
            </div>
        </div>
      </div>

      {/* Content */}
      <div className={`px-8 pt-6 grid grid-cols-1 gap-6 ${viewMode === 'year' ? 'max-w-full' : 'max-w-4xl md:grid-cols-2'}`}>
        {habits.map(habit => (
            <HabitCard 
                key={habit.id} 
                habit={habit} 
                onToggle={onToggleHabit} 
                viewMode={viewMode}
                viewDate={viewDate}
                onClick={() => onEditHabit(habit)}
            />
        ))}
        {habits.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400">
                <p>还没有建立习惯，现在开始吧！</p>
            </div>
        )}
      </div>
    </div>
  );
};
