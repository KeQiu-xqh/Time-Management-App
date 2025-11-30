
import React from 'react';
import { Habit } from '../types';
import { Flame, Check } from 'lucide-react';

export type HabitViewMode = 'week' | 'month' | 'year';

interface HabitCardProps {
  habit: Habit;
  onToggle: (id: string, dateStr: string) => void;
  viewMode: HabitViewMode;
  viewDate: Date;
  onClick?: () => void;
}

export const HabitCard: React.FC<HabitCardProps> = ({ habit, onToggle, viewMode, viewDate, onClick }) => {
  const realToday = new Date();
  const realTodayStr = realToday.toISOString().split('T')[0];

  const getDayLabel = (date: Date) => ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];

  const renderWeek = () => {
    const startOfWeek = new Date(viewDate);
    startOfWeek.setDate(viewDate.getDate() - viewDate.getDay());

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });

    return (
      <div className="flex justify-between items-center pt-2">
        {days.map((date) => {
          const dateStr = date.toISOString().split('T')[0];
          const isCompleted = habit.completedDates.includes(dateStr);
          const isRealToday = dateStr === realTodayStr;
          
          return (
            <div key={dateStr} className="flex flex-col items-center gap-2">
              <span className={`text-[10px] font-medium ${isRealToday ? 'text-app-primary font-bold' : 'text-gray-400'}`}>
                {getDayLabel(date)}
              </span>
              
              <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle(habit.id, dateStr);
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-app-primary text-white shadow-md shadow-indigo-200 scale-100' 
                    : 'bg-gray-100 text-transparent hover:bg-gray-200'
                } ${isRealToday ? 'ring-2 ring-orange-400 ring-offset-1' : ''}`}
              >
                <Check size={16} strokeWidth={3} className={isCompleted ? 'scale-100' : 'scale-0'} style={{transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'}} />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonth = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => i);
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="pt-2">
         <div className="grid grid-cols-7 mb-2">
            {['日','一','二','三','四','五','六'].map(d => (
                <div key={d} className="text-center text-[10px] text-gray-300 font-bold">{d}</div>
            ))}
         </div>
         <div className="grid grid-cols-7 gap-y-2 gap-x-1">
            {blanks.map(b => <div key={`blank-${b}`} />)}
            {monthDays.map(day => {
                const date = new Date(year, month, day);
                const dateStr = date.toISOString().split('T')[0];
                const isCompleted = habit.completedDates.includes(dateStr);
                const isRealToday = dateStr === realTodayStr;

                return (
                    <button
                        key={dateStr}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle(habit.id, dateStr);
                        }}
                        className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                            isCompleted 
                                ? 'bg-app-primary text-white shadow-sm' 
                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                        } ${isRealToday ? 'ring-2 ring-orange-400 ring-offset-1 z-10' : ''}`}
                    >
                        {day}
                    </button>
                );
            })}
         </div>
      </div>
    );
  };

  const renderYear = () => {
    const year = viewDate.getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    const allDates: Date[] = [];
    let curr = new Date(startDate);
    while (curr <= endDate) {
        allDates.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
    }

    return (
        <div className="w-full overflow-x-auto no-scrollbar pb-2">
            <div 
                className="grid gap-1 min-w-max"
                style={{
                    gridTemplateRows: 'repeat(7, 1fr)',
                    gridAutoFlow: 'column'
                }}
            >
                {allDates.map(date => {
                    const dateStr = date.toISOString().split('T')[0];
                    const isCompleted = habit.completedDates.includes(dateStr);
                    const isRealToday = dateStr === realTodayStr;
                    
                    return (
                        <div
                            key={dateStr}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggle(habit.id, dateStr);
                            }}
                            title={dateStr}
                            className={`w-3 h-3 rounded-sm transition-colors cursor-pointer ${
                                isCompleted 
                                    ? 'bg-app-primary' 
                                    : 'bg-gray-100 hover:bg-gray-200'
                            } ${isRealToday ? 'ring-1 ring-orange-400 ring-offset-1' : ''}`}
                        />
                    );
                })}
            </div>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
                <span>{year} Jan</span>
                <span className="flex-1"></span>
                <div className="w-2 h-2 bg-gray-100 rounded-sm"></div> <span>未做</span>
                <div className="w-2 h-2 bg-app-primary rounded-sm"></div> <span>已做</span>
                <span className="flex-1"></span>
                <span>Dec</span>
            </div>
        </div>
    );
  };

  return (
    <div 
        onClick={onClick}
        className={`bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-200 border border-transparent hover:border-indigo-50 cursor-pointer ${viewMode === 'year' ? 'col-span-full' : ''}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">{habit.title}</h3>
          <div className="flex items-center gap-1.5 text-xs font-bold text-orange-500 bg-orange-50 w-fit px-2 py-1 rounded-md">
            <Flame size={14} fill="currentColor" />
            <span>连续 {habit.streak} 天</span>
          </div>
        </div>
      </div>

      <div className="animate-fade-in">
        {viewMode === 'week' && renderWeek()}
        {viewMode === 'month' && renderMonth()}
        {viewMode === 'year' && renderYear()}
      </div>
    </div>
  );
};
