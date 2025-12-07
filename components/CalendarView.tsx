
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Task, Habit } from '../types';
import { TaskCard } from './TaskCard';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Grid, AlertCircle, ArrowLeft, Inbox, List, AlignLeft, Clock, History, Flame, Eye, EyeOff } from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  habits: Habit[]; // Received Habits
  onToggleTask: (id: string) => void;
  onToggleHabit: (id: string, dateStr: string) => void; // Handle Habit Toggle
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onEditHabit: (habit: Habit) => void; // New prop
  onScheduleTask: (id: string, date: Date, startTime?: string | null) => void;
  onUnscheduleTask: (id: string) => void;
  onConvertHabitToTask: (habitId: string, date: Date, startTime: string) => void; // New prop
}

const HOUR_HEIGHT = 64; // Height in pixels for one hour slot

export const CalendarView: React.FC<CalendarViewProps> = ({ 
    tasks, 
    habits,
    onToggleTask, 
    onToggleHabit,
    onAddTask, 
    onEditTask,
    onEditHabit,
    onScheduleTask,
    onUnscheduleTask,
    onConvertHabitToTask
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [displayMode, setDisplayMode] = useState<'list' | 'timeline'>('list'); // Unified display mode
  const [isDragOverBacklog, setIsDragOverBacklog] = useState(false);
  const [showCompletedBacklog, setShowCompletedBacklog] = useState(true);
  const [isMobileBacklogOpen, setIsMobileBacklogOpen] = useState(false);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const weekTimelineScrollRef = useRef<HTMLDivElement>(null);

  // --- Date Helpers ---
  const getStartOfWeek = (d: Date) => {
     const date = new Date(d);
     const day = date.getDay(); // 0 (Sun) - 6 (Sat)
     const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday to get previous Monday
     return new Date(date.setDate(diff));
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() && 
           d1.getMonth() === d2.getMonth() && 
           d1.getFullYear() === d2.getFullYear();
  };

  const isToday = (d: Date) => isSameDay(d, new Date());

  const addDays = (d: Date, days: number) => {
    const newDate = new Date(d);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  };

  // --- Scroll to 8 AM on mount/switch to timeline ---
  useEffect(() => {
    if (displayMode === 'timeline') {
        const scrollTarget = 8 * HOUR_HEIGHT - 40;
        if (viewMode === 'day' && timelineScrollRef.current) {
            timelineScrollRef.current.scrollTop = scrollTarget;
        }
        if (viewMode === 'week' && weekTimelineScrollRef.current) {
            weekTimelineScrollRef.current.scrollTop = scrollTarget;
        }
    }
  }, [displayMode, viewMode]);

  // --- Navigation Handlers ---
  const handlePrev = () => {
    if (viewMode === 'month') {
        setSelectedDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() - 1);
            return d;
        });
    } else {
        const daysToSubtract = viewMode === 'week' ? 7 : 1;
        setSelectedDate(prev => addDays(prev, -daysToSubtract));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
        setSelectedDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + 1);
            return d;
        });
    } else {
        const daysToAdd = viewMode === 'week' ? 7 : 1;
        setSelectedDate(prev => addDays(prev, daysToAdd));
    }
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // --- Drag & Drop Handlers ---
  const resetDragState = () => {
      setIsDragOverBacklog(false);
  };

  const handleDragStart = (e: React.DragEvent, id: string, type: 'backlog' | 'timeline' | 'habit') => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/json', JSON.stringify({ id, type }));
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  // 1. Drop on Day Timeline
  const handleDropOnDayTimeline = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      resetDragState();
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      
      try {
        const { id, type } = JSON.parse(dataStr);
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetY = e.clientY - rect.top;
        const timeStr = calculateTimeFromOffsetY(offsetY);
        
        if (type === 'habit') {
            onConvertHabitToTask(id, selectedDate, timeStr);
        } else {
            onScheduleTask(id, selectedDate, timeStr);
        }
      } catch (err) {
          console.error("Drop error", err);
      }
  };

  // 2. Drop on Week Timeline
  const handleDropOnWeekTimeline = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      resetDragState();
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;

      try {
          const { id, type } = JSON.parse(dataStr);
          const rect = e.currentTarget.getBoundingClientRect();
          const offsetX = e.clientX - rect.left;
          const offsetY = e.clientY - rect.top;

          // Calculate Day Index (0-6)
          const colWidth = rect.width / 7;
          const dayIndex = Math.min(6, Math.max(0, Math.floor(offsetX / colWidth)));
          const targetDate = addDays(startOfWeekDate, dayIndex);

          // Calculate Time
          const timeStr = calculateTimeFromOffsetY(offsetY);

          if (type === 'habit') {
               onConvertHabitToTask(id, targetDate, timeStr);
          } else {
               onScheduleTask(id, targetDate, timeStr);
          }

      } catch (err) {
          console.error("Drop Week error", err);
      }
  };

  const calculateTimeFromOffsetY = (offsetY: number) => {
      const rawMinutes = (offsetY / HOUR_HEIGHT) * 60;
      const snappedMinutes = Math.max(0, Math.round(rawMinutes / 15) * 15);
      const hours = Math.floor(snappedMinutes / 60);
      const minutes = snappedMinutes % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // 3. Drop on All Day (Day View)
  const handleDropOnAllDay = (e: React.DragEvent) => {
      e.preventDefault();
      resetDragState();
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;

      try {
          const { id, type } = JSON.parse(dataStr);
          if (type !== 'habit') {
             onScheduleTask(id, selectedDate, null);
          }
      } catch (err) {
          console.error("Drop All Day error", err);
      }
  };

  // 4. Drop on All Day (Week View)
  const handleDropOnWeekAllDay = (e: React.DragEvent, dayIndex: number) => {
      e.preventDefault();
      resetDragState();
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;

      try {
          const { id, type } = JSON.parse(dataStr);
          const targetDate = addDays(startOfWeekDate, dayIndex);
          if (type !== 'habit') {
              onScheduleTask(id, targetDate, null);
          }
      } catch (err) {
          console.error("Drop Week All Day error", err);
      }
  }

  // --- Backlog Drag & Drop Handlers ---
  const handleBacklogDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      if (!isDragOverBacklog) setIsDragOverBacklog(true);
  };

  const handleBacklogDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOverBacklog(false);
      }
  };

  const handleBacklogDrop = (e: React.DragEvent) => {
      e.preventDefault();
      resetDragState();
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;

      try {
          const { id, type } = JSON.parse(dataStr);
          if (type === 'timeline') {
              onUnscheduleTask(id);
          }
      } catch (err) {
          console.error("Drop Backlog error", err);
      }
  };

  // --- Mixed Toggle Handler ---
  const handleToggleMixed = (id: string, date?: Date) => {
      const isHabit = habits.some(h => h.id === id);
      if (isHabit) {
          const d = date || selectedDate;
          const dateStr = d.toISOString().split('T')[0];
          onToggleHabit(id, dateStr);
      } else {
          onToggleTask(id);
      }
  };

  // --- Data Preparation ---
  const startOfWeekDate = getStartOfWeek(selectedDate);
  const weekDays = useMemo(() => {
     return Array.from({length: 7}, (_, i) => {
        const d = addDays(startOfWeekDate, i);
        return {
            date: d,
            dayName: ['周一','周二','周三','周四','周五','周六','周日'][i],
            isToday: isToday(d),
            isSelected: isSameDay(d, selectedDate)
        };
     });
  }, [startOfWeekDate, selectedDate]);

  const currentDayTasks = useMemo(() => {
      return tasks.filter(t => t.doDate && isSameDay(new Date(t.doDate), selectedDate));
  }, [tasks, selectedDate]);

  const habitTasks = useMemo(() => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      return habits.map(h => ({
          id: h.id,
          title: h.title,
          isCompleted: h.completedDates.includes(dateStr),
          doDate: selectedDate,
          isHabit: true,
          streak: h.streak,
          category: h.category || { id: 'habit_cat', name: '习惯', colorBg: 'bg-orange-100', colorText: 'text-orange-600' },
          startTime: h.defaultTime,
          duration: h.defaultTime ? 30 : undefined,
          originalHabitId: h.id
      } as Task));
  }, [habits, selectedDate]);

  const { allDayTasks, timedTasks } = useMemo(() => {
      const allDay: Task[] = [];
      const timed: Task[] = [];
      
      // 1. Real Tasks
      currentDayTasks.forEach(t => {
          if (t.startTime) timed.push(t);
          else allDay.push(t);
      });

      // 2. Habits with Default Time (Virtual Tasks)
      habitTasks.forEach(h => {
          if (h.startTime) {
              // Only add if not already overridden by a real task instance
              const isOverridden = timed.some(t => t.originalHabitId === h.id);
              if (!isOverridden) {
                  timed.push(h);
              }
          }
      });

      return { allDayTasks: allDay, timedTasks: timed };
  }, [currentDayTasks, habitTasks]);

  const overdueTasks = useMemo(() => {
    return tasks.filter(t => {
        if (!t.doDate || t.isCompleted) return false;
        const now = new Date();
        now.setHours(0,0,0,0);
        const d = new Date(t.doDate);
        d.setHours(0,0,0,0);
        return d < now;
    });
  }, [tasks]);

  const unscheduledTasks = useMemo(() => {
      return tasks.filter(t => !t.doDate && (showCompletedBacklog || !t.isCompleted)).reverse();
  }, [tasks, showCompletedBacklog]);

  // --- Helper: Calculate Position ---
  const getTaskPosition = (timeStr: string, duration = 30) => {
      const [h, m] = timeStr.split(':').map(Number);
      const startMinutes = h * 60 + m;
      const top = (startMinutes / 60) * HOUR_HEIGHT;
      const height = (duration / 60) * HOUR_HEIGHT;
      return { top, height };
  };

  const getCurrentTimePosition = () => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      return (minutes / 60) * HOUR_HEIGHT;
  };

  const handleEditClick = (task: Task) => {
      if (task.isHabit) {
          const originalHabit = habits.find(h => h.id === task.id);
          if (originalHabit) onEditHabit(originalHabit);
      } else {
          onEditTask(task);
      }
  };

  // 5. Drop on Month Cell
  const handleDropOnMonthCell = (e: React.DragEvent, date: Date) => {
      e.preventDefault();
      resetDragState();
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;

      try {
          const { id, type } = JSON.parse(dataStr);
          if (type === 'habit') {
             // Optional: Convert habit to task for this specific day
             onConvertHabitToTask(id, date, "09:00"); 
          } else {
             onScheduleTask(id, date, null);
          }
      } catch (err) {
          console.error("Drop Month error", err);
      }
  };

  const renderMonthView = () => {
      const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const startDate = getStartOfWeek(monthStart);
      const days = Array.from({ length: 42 }, (_, i) => addDays(startDate, i));
      const weekDaysHeader = ['周一','周二','周三','周四','周五','周六','周日'];

      return (
          <div className="flex flex-col h-full bg-white overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 flex-none">
                  {weekDaysHeader.map((d, i) => (
                      <div key={i} className="py-2 text-center text-xs font-bold text-gray-500 uppercase">
                          {d}
                      </div>
                  ))}
              </div>
              
              {/* Grid */}
              <div className="flex-1 grid grid-cols-7 grid-rows-6 overflow-y-auto">
                  {days.map((d, i) => {
                      const isCurrentMonth = d.getMonth() === selectedDate.getMonth();
                      const isTodayDate = isToday(d);
                      const dateStr = d.toISOString().split('T')[0];
                      
                      // Filter Tasks
                      const dayTasks = tasks.filter(t => t.doDate && isSameDay(new Date(t.doDate), d));
                      
                      // Filter Habits (Show completed)
                      const dayHabits = habits.filter(h => h.completedDates.includes(dateStr)).map(h => ({
                          ...h,
                          id: h.id,
                          title: h.title,
                          isCompleted: true,
                          isHabit: true,
                          category: h.category || { id: 'habit', name: '习惯', colorBg: 'bg-orange-100', colorText: 'text-orange-600' }
                      } as any));

                      // Combine and Sort
                      const combined = [
                          ...dayHabits,
                          ...dayTasks
                      ].sort((a, b) => {
                          if (a.isHabit && !b.isHabit) return -1;
                          if (!a.isHabit && b.isHabit) return 1;
                          if (a.startTime && !b.startTime) return -1;
                          if (!a.startTime && b.startTime) return 1;
                          return 0;
                      });

                      const displayItems = combined.slice(0, 3);
                      const remaining = combined.length - 3;

                      return (
                          <div 
                              key={i}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDropOnMonthCell(e, d)}
                              onClick={() => {
                                  setSelectedDate(d);
                                  setViewMode('day');
                              }}
                              className={`border-b border-r border-gray-100 p-1 min-h-[80px] flex flex-col transition-colors hover:bg-gray-50 cursor-pointer ${
                                  !isCurrentMonth ? 'bg-gray-50/30 text-gray-400' : 'bg-white'
                              } ${isTodayDate ? 'bg-indigo-50/30' : ''}`}
                          >
                              <div className="flex justify-center mb-1">
                                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                                      isTodayDate ? 'bg-app-primary text-white' : 'text-gray-700'
                                  }`}>
                                      {d.getDate()}
                                  </span>
                              </div>
                              
                              <div className="flex-1 space-y-1 overflow-hidden">
                                  {/* Desktop: Text Bars */}
                                  <div className="hidden md:block space-y-1">
                                      {displayItems.map((item: any, idx) => (
                                          <div 
                                              key={`${item.id}-${idx}`}
                                              className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 ${
                                                  item.isHabit 
                                                    ? 'bg-orange-100 text-orange-700' 
                                                    : item.isCompleted 
                                                        ? 'bg-gray-100 text-gray-400 line-through'
                                                        : item.category ? item.category.colorBg + ' ' + item.category.colorText.replace('text-', 'text-opacity-90 text-') : 'bg-blue-100 text-blue-700'
                                              }`}
                                              title={item.title}
                                          >
                                              {item.isHabit && <Flame size={8} fill="currentColor" />}
                                              {item.title}
                                          </div>
                                      ))}
                                      {remaining > 0 && (
                                          <div className="text-[9px] text-gray-400 font-bold text-center hover:text-app-primary">
                                              +{remaining} 更多
                                          </div>
                                      )}
                                  </div>

                                  {/* Mobile: Dots */}
                                  <div className="md:hidden flex flex-wrap justify-center gap-0.5 content-start pt-1">
                                      {combined.slice(0, 6).map((item: any, idx) => (
                                           <div 
                                              key={idx} 
                                              className={`w-1.5 h-1.5 rounded-full ${
                                                  item.isHabit 
                                                    ? 'bg-orange-400' 
                                                    : item.category ? item.category.colorText.replace('text-', 'bg-') : 'bg-blue-400'
                                              }`}
                                           ></div>
                                      ))}
                                      {combined.length > 6 && <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>}
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  // --- Renderers ---
  const renderDayTimeline = () => {
      const hours = Array.from({ length: 24 }, (_, i) => i);
      const currentTimeTop = isToday(selectedDate) ? getCurrentTimePosition() : -1;

      return (
          <div className="flex flex-col h-full overflow-hidden bg-white border-t border-gray-100">
              {/* A. All-Day Section (Fixed) */}
              <div 
                className="flex-none border-b border-gray-100 bg-gray-50/50 min-h-[80px] transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleDropOnAllDay}
              >
                  <div className="p-4">
                    <div className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide flex items-center justify-between">
                        <span>全天 & 习惯</span>
                        <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">{allDayTasks.length + habitTasks.filter(t => !t.startTime).length}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {allDayTasks.length === 0 && habitTasks.filter(t => !t.startTime).length === 0 && (
                            <div className="text-[10px] text-gray-300 italic border border-dashed border-gray-200 px-3 py-1 rounded-lg">
                                拖拽至此处设为全天
                            </div>
                        )}
                        
                        {/* Habits */}
                        {habitTasks.filter(t => !t.startTime).map(t => {
                            const isScheduled = timedTasks.some(timedTask => timedTask.originalHabitId === t.id);
                            return (
                                <div 
                                    key={t.id} 
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, t.id, 'habit')}
                                    onDragEnd={resetDragState}
                                    className={`group relative px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
                                        t.isCompleted ? 'bg-orange-50 text-orange-400 border-orange-100' : 'bg-white border-orange-200 text-gray-700'
                                    }`}
                                >
                                    <div onClick={(e) => { e.stopPropagation(); handleToggleMixed(t.id); }} className="flex items-center gap-2 cursor-pointer">
                                        {t.isCompleted ? <div className="w-2 h-2 rounded-full bg-orange-400" /> : <div className="w-2 h-2 rounded-full border-2 border-orange-400" />}
                                        <span className={t.isCompleted ? 'line-through opacity-50' : ''}>{t.title}</span>
                                        <Flame size={10} className="text-orange-500" fill={t.streak ? "currentColor" : "none"} />
                                    </div>
                                    {isScheduled && !t.isCompleted && (
                                        <Clock size={12} className="text-orange-300" />
                                    )}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleEditClick(t); }} 
                                        className="opacity-0 group-hover:opacity-100 ml-1 text-gray-400 hover:text-orange-500"
                                    >
                                        Edit
                                    </button>
                                </div>
                            );
                        })}

                        {/* Tasks */}
                        {allDayTasks.map(t => (
                            <div 
                                key={t.id} 
                                draggable
                                onDragStart={(e) => handleDragStart(e, t.id, 'timeline')}
                                onDragEnd={resetDragState}
                                onClick={() => onEditTask(t)}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2 cursor-pointer hover:shadow-md transition-all active:opacity-50 active:cursor-grabbing ${
                                    t.isCompleted ? 'bg-gray-100 text-gray-400 border-transparent' : 'bg-white border-gray-200 text-gray-700 cursor-grab'
                                }`}
                            >
                                <div className={`w-2 h-2 rounded-full ${t.category?.colorBg || 'bg-gray-300'}`}></div>
                                <span className={t.isCompleted ? 'line-through' : ''}>{t.title}</span>
                            </div>
                        ))}
                    </div>
                  </div>
              </div>

              {/* B. Scrollable Time Grid */}
              <div ref={timelineScrollRef} className="flex-1 overflow-y-auto relative no-scrollbar bg-white">
                  <div className="flex min-h-[1440px]" style={{ height: 24 * HOUR_HEIGHT }}>
                      {/* Ruler */}
                      <div className="w-16 flex-shrink-0 border-r border-gray-50 bg-gray-50/30 text-xs text-gray-400 font-medium text-right pr-3 pt-2 select-none">
                          {hours.map(h => (
                              <div key={h} style={{ height: HOUR_HEIGHT }} className="relative">
                                  <span className="-top-3 relative">{h.toString().padStart(2, '0')}:00</span>
                              </div>
                          ))}
                      </div>

                      {/* Grid Lines & Content Container */}
                      <div 
                        className="flex-1 relative"
                        onDragOver={handleDragOver}
                        onDrop={handleDropOnDayTimeline}
                      >
                          {hours.map(h => (
                              <div 
                                key={h} 
                                className="absolute w-full border-t border-gray-50 pointer-events-none" 
                                style={{ top: h * HOUR_HEIGHT }}
                              ></div>
                          ))}

                          {currentTimeTop >= 0 && (
                              <div 
                                className="absolute w-full border-t-2 border-red-400 z-20 pointer-events-none flex items-center"
                                style={{ top: currentTimeTop }}
                              >
                                  <div className="w-2 h-2 bg-red-400 rounded-full -ml-1"></div>
                              </div>
                          )}

                          {timedTasks.map(t => {
                              if (!t.startTime) return null;
                              const { top, height } = getTaskPosition(t.startTime, t.duration);
                              const isHabitInstance = !!t.originalHabitId;
                              
                              return (
                                  <div
                                      key={t.id}
                                      draggable
                                      onDragStart={(e) => {
                                          handleDragStart(e, t.id, 'timeline');
                                      }}
                                      onDragEnd={resetDragState}
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          onEditTask(t);
                                      }}
                                      className={`absolute left-2 right-4 rounded-lg border-l-4 p-2 shadow-sm hover:shadow-md hover:z-10 transition-all overflow-hidden cursor-grab active:cursor-grabbing active:opacity-60 group ${
                                          t.category ? t.category.colorBg.replace('bg-', 'bg-opacity-20 bg-') : 'bg-gray-100'
                                      } ${t.category ? t.category.colorBg.replace('bg-', 'border-') : 'border-gray-300'}
                                      ${isHabitInstance ? 'border-l-orange-400 bg-orange-50/50' : ''}`}
                                      style={{ top, height: Math.max(height, 28) }} 
                                  >
                                      <div className="flex flex-col h-full pointer-events-none">
                                          {/* Category Label */}
                                          {t.category && (t.duration || 30) >= 30 && (
                                              <div className="text-[10px] font-bold opacity-60 truncate mb-0.5">
                                                  {t.category.name}
                                              </div>
                                          )}

                                          <div className="flex items-start justify-between gap-1 min-w-0">
                                              <div className={`text-xs font-bold truncate leading-tight ${t.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                  {t.title}
                                                  {isHabitInstance && <span className="ml-1 text-[9px] text-orange-500 bg-orange-100 px-1 rounded">习惯</span>}
                                              </div>
                                              {t.isCompleted && <div className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-app-primary text-white flex items-center justify-center text-[9px]">✓</div>}
                                          </div>

                                          {/* Time (Show if height allows) */}
                                          {(t.duration || 30) >= 45 && (
                                              <div className="text-[10px] text-gray-500 font-medium flex items-center gap-1 mt-auto group-hover:text-gray-700">
                                                 <Clock size={10} />
                                                 {t.startTime}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const renderWeekTimeline = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const currentTimeTop = getCurrentTimePosition();

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white border-t border-gray-100">
            {/* 1. Header Row: Dates & All Day */}
            <div className="flex-none border-b border-gray-100 bg-gray-50/50">
                 {/* Spacer for ruler */}
                 <div className="w-16 flex-shrink-0 border-r border-gray-100 bg-gray-50 hidden md:block"></div>
                 <div className="w-8 flex-shrink-0 border-r border-gray-100 bg-gray-50 md:hidden"></div>
                 
                 {/* Day Columns Header */}
                 <div className="flex-1 flex overflow-hidden">
                     {weekDays.map((d, i) => {
                         const dayAllDayTasks = tasks.filter(t => t.doDate && isSameDay(new Date(t.doDate), d.date) && !t.startTime);
                         const dayHabits = habits; // Show habits in all day for each day
                         
                         return (
                             <div 
                                key={i} 
                                className={`flex-1 flex flex-col border-r border-gray-100 min-w-0 ${d.isToday ? 'bg-indigo-50/20' : ''}`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDropOnWeekAllDay(e, i)}
                             >
                                 <div className={`text-center py-2 border-b border-gray-100 ${d.isToday ? 'bg-indigo-50/50' : ''}`}>
                                    <div className={`text-[8px] md:text-[10px] font-bold uppercase truncate ${d.isToday ? 'text-app-primary' : 'text-gray-400'}`}>{d.dayName}</div>
                                    <div className={`text-xs md:text-sm font-bold ${d.isToday ? 'text-app-primary' : 'text-gray-700'}`}>{d.date.getDate()}</div>
                                 </div>
                                 <div className="p-1 min-h-[40px] space-y-1 hidden md:block">
                                    {/* Small chips for all day tasks in week view - Hide on mobile to save space */}
                                    {dayAllDayTasks.map(t => (
                                        <div 
                                            key={t.id} 
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, t.id, 'timeline')}
                                            onDragEnd={resetDragState}
                                            onClick={() => onEditTask(t)}
                                            className={`truncate text-[9px] px-1 py-0.5 rounded border ${t.isCompleted ? 'bg-gray-100 text-gray-400' : 'bg-white border-gray-200'} cursor-grab`}
                                        >
                                            {t.title}
                                        </div>
                                    ))}
                                 </div>
                             </div>
                         )
                     })}
                 </div>
            </div>

            {/* 2. Scrollable Body */}
            <div ref={weekTimelineScrollRef} className="flex-1 overflow-y-auto relative no-scrollbar bg-white">
                 <div className="flex min-h-[1440px]" style={{ height: 24 * HOUR_HEIGHT }}>
                      {/* Ruler */}
                      <div className="w-16 flex-shrink-0 border-r border-gray-50 bg-gray-50/30 text-xs text-gray-400 font-medium text-right pr-3 pt-2 select-none hidden md:block">
                          {hours.map(h => (
                              <div key={h} style={{ height: HOUR_HEIGHT }} className="relative">
                                  <span className="-top-3 relative">{h.toString().padStart(2, '0')}:00</span>
                              </div>
                          ))}
                      </div>
                      <div className="w-8 flex-shrink-0 border-r border-gray-50 bg-gray-50/30 text-[10px] text-gray-400 font-medium text-right pr-1 pt-2 select-none md:hidden">
                          {hours.map(h => (
                              <div key={h} style={{ height: HOUR_HEIGHT }} className="relative">
                                  <span className="-top-2 relative">{h}</span>
                              </div>
                          ))}
                      </div>

                      {/* Main Grid */}
                      <div 
                        className="flex-1 relative flex"
                        onDragOver={handleDragOver}
                        onDrop={handleDropOnWeekTimeline}
                      >
                           {/* Background Grid (Hours) */}
                           <div className="absolute inset-0 pointer-events-none">
                                {hours.map(h => (
                                    <div key={h} className="w-full border-t border-gray-50" style={{ height: HOUR_HEIGHT }}></div>
                                ))}
                           </div>

                           {/* Vertical Day Columns */}
                           {weekDays.map((d, i) => (
                               <div 
                                    key={i} 
                                    className={`flex-1 border-r border-gray-50 h-full relative ${d.isToday ? 'bg-indigo-50/10' : ''}`}
                               >
                                   {/* Current Time Line (Only on Today's column) */}
                                   {d.isToday && (
                                       <div 
                                          className="absolute w-full border-t-2 border-red-400 z-20 pointer-events-none flex items-center"
                                          style={{ top: currentTimeTop }}
                                       >
                                            <div className="w-2 h-2 bg-red-400 rounded-full -ml-1"></div>
                                       </div>
                                   )}
                               </div>
                           ))}

                           {/* Task Blocks (Absolute Positioned over the columns) */}
                           {weekDays.map((d, dayIndex) => {
                               // Filter tasks for this day
                               const dayTimedTasks = tasks.filter(t => t.doDate && isSameDay(new Date(t.doDate), d.date) && t.startTime);
                               
                               // Filter habits with defaultTime
                               const dayHabits = habits.filter(h => h.defaultTime).map(h => ({
                                   id: h.id,
                                   title: h.title,
                                   isCompleted: h.completedDates.includes(d.date.toISOString().split('T')[0]),
                                   doDate: d.date,
                                   isHabit: true,
                                   streak: h.streak,
                                   category: h.category || { id: 'habit_cat', name: '习惯', colorBg: 'bg-orange-100', colorText: 'text-orange-600' },
                                   startTime: h.defaultTime,
                                   duration: 30,
                                   originalHabitId: h.id
                               } as Task));

                               // Merge: Only add habit if not overridden
                               dayHabits.forEach(h => {
                                   const isOverridden = dayTimedTasks.some(t => t.originalHabitId === h.id);
                                   if (!isOverridden) {
                                       dayTimedTasks.push(h);
                                   }
                               });

                               return dayTimedTasks.map(t => {
                                   if (!t.startTime) return null;
                                   const { top, height } = getTaskPosition(t.startTime, t.duration);
                                   const isHabitInstance = !!t.originalHabitId;
                                   
                                   // Calculate Left position based on Day Index (approx 14.28%)
                                   const left = `${(dayIndex / 7) * 100}%`;
                                   const width = `${100 / 7}%`;

                                   return (
                                       <div
                                          key={t.id}
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, t.id, 'timeline')}
                                          onDragEnd={resetDragState}
                                          onClick={(e) => { e.stopPropagation(); onEditTask(t); }}
                                          className={`absolute rounded-md border-l-4 p-1 shadow-sm hover:z-30 hover:shadow-md transition-all overflow-hidden cursor-grab active:cursor-grabbing text-[10px] leading-tight group
                                            ${t.category ? t.category.colorBg.replace('bg-', 'bg-opacity-20 bg-') : 'bg-gray-100'} 
                                            ${t.category ? t.category.colorBg.replace('bg-', 'border-') : 'border-gray-300'}
                                            ${isHabitInstance ? 'border-l-orange-400 bg-orange-50/50' : ''}
                                          `}
                                          style={{ 
                                              top, 
                                              height: Math.max(height, 24),
                                              left: `calc(${left} + 2px)`, // Add small gap
                                              width: `calc(${width} - 4px)` // Subtract gap
                                          }}
                                       >
                                           <div className="flex flex-col h-full pointer-events-none">
                                               {t.category && (t.duration || 30) >= 30 && (
                                                   <div className="text-[9px] opacity-70 truncate leading-none mb-0.5">
                                                       {t.category.name}
                                                   </div>
                                               )}
                                               <div className={`font-bold truncate ${t.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                   {t.title}
                                               </div>
                                               <div className="hidden group-hover:block text-[9px] text-gray-500 mt-auto">
                                                   {t.startTime}
                                               </div>
                                           </div>
                                       </div>
                                   );
                               });
                           })}
                      </div>
                 </div>
            </div>
        </div>
    );
  };

  return (
    <div className="h-full w-full flex overflow-hidden">
       {/* --- CENTER MAIN CONTENT --- */}
       <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-gray-100">
           {/* Sticky Header */}
           <div className="flex-none bg-app-bg/95 backdrop-blur-sm z-40 pt-8 px-8 border-b border-gray-100/50">
              <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-4">
                 <div>
                    <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                       {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}月
                       {viewMode === 'day' && <span className="text-gray-300">/ {selectedDate.getDate()}日</span>}
                    </h2>
                    <p className="text-gray-400 font-medium">
                        {viewMode === 'day' ? '专注于当下的任务。' : viewMode === 'week' ? '查看本周任务概览。' : '宏观规划整月进度。'}
                    </p>
                 </div>

                 <div className="flex items-center gap-3">
                     <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex mr-2">
                        <button 
                            onClick={() => { setViewMode('day'); setDisplayMode('list'); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${viewMode === 'day' ? 'bg-indigo-50 text-app-primary' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <CalendarIcon size={14} /> 日
                        </button>
                        <button 
                            onClick={() => { setViewMode('week'); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${viewMode === 'week' ? 'bg-indigo-50 text-app-primary' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Grid size={14} /> 周
                        </button>
                        <button 
                            onClick={() => { setViewMode('month'); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${viewMode === 'month' ? 'bg-indigo-50 text-app-primary' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Grid size={14} /> 月
                        </button>
                     </div>

                     <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-100 p-1">
                        <button onClick={handlePrev} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-50 text-gray-500 transition-colors">
                            <ChevronLeft size={18} />
                        </button>
                        <button onClick={handleToday} className="px-3 text-xs font-bold text-gray-600 hover:text-app-primary transition-colors">
                            回到今天
                        </button>
                        <button onClick={handleNext} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-50 text-gray-500 transition-colors">
                            <ChevronRight size={18} />
                        </button>
                     </div>
                     
                     <div className="w-px h-6 bg-gray-300 mx-1 hidden sm:block"></div>

                     <button 
                        onClick={() => setIsMobileBacklogOpen(true)}
                        className="lg:hidden flex items-center justify-center w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-600 active:scale-95 transition-transform"
                     >
                        <Inbox size={20} />
                     </button>

                     <button 
                        onClick={onAddTask}
                        className="flex items-center gap-2 bg-app-primary text-white px-3 py-2 md:px-4 md:py-2.5 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95"
                    >
                        <Plus size={18} strokeWidth={3} />
                        <span className="font-bold text-sm hidden sm:inline">新建</span>
                    </button>
                 </div>
              </div>

              {/* View Mode Toggles (List vs Timeline) - Available for BOTH Day and Week */}
              <div className="flex items-center justify-between pb-4">
                 {viewMode === 'day' && (
                     <div className="flex gap-2 overflow-x-auto no-scrollbar">
                         {weekDays.map((d, i) => (
                             <div 
                                 key={i}
                                 onClick={() => setSelectedDate(d.date)}
                                 className={`min-w-[40px] flex flex-col items-center py-1 rounded-lg cursor-pointer border border-transparent ${
                                     d.isSelected 
                                        ? 'bg-white shadow-sm border-indigo-100' 
                                        : 'hover:bg-white/50 text-gray-400'
                                 }`}
                             >
                                 <span className="text-[9px] font-bold uppercase">{d.dayName}</span>
                                 <span className={`text-sm font-bold ${d.isSelected ? 'text-app-primary' : ''}`}>{d.date.getDate()}</span>
                             </div>
                         ))}
                     </div>
                 )}
                 {viewMode !== 'month' && (
                 <div className={`${viewMode === 'day' ? '' : 'w-full flex justify-center'}`}>
                    <div className="flex bg-gray-100/80 p-1 rounded-lg">
                           <button
                              onClick={() => setDisplayMode('list')}
                              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                                  displayMode === 'list' 
                                  ? 'bg-white text-gray-800 shadow-sm' 
                                  : 'text-gray-500 hover:text-gray-700'
                              }`}
                           >
                              <List size={14} strokeWidth={2.5} />
                              列表
                           </button>
                           <button
                              onClick={() => setDisplayMode('timeline')}
                              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                                  displayMode === 'timeline' 
                                  ? 'bg-white text-gray-800 shadow-sm' 
                                  : 'text-gray-500 hover:text-gray-700'
                              }`}
                           >
                              <AlignLeft size={14} strokeWidth={2.5} className="rotate-90" />
                              时间轴
                           </button>
                    </div>
                 </div>
                 )}
              </div>
           </div>

           {/* Content Area */}
           <div className="flex-1 overflow-hidden bg-app-bg relative"> 
              {/* --- DAY VIEW --- */}
              {viewMode === 'day' && (
                 <>
                    {displayMode === 'list' ? (
                        <div className="h-full overflow-y-auto px-8 pt-4 pb-20 space-y-8 no-scrollbar">
                             {/* ... Day List Logic ... */}
                             {isToday(selectedDate) && overdueTasks.length > 0 && (
                                 <div className="animate-fade-in">
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                       <AlertCircle size={16} className="text-red-500" />
                                       <span className="text-sm font-bold text-red-500">逾期任务 ({overdueTasks.length})</span>
                                    </div>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {overdueTasks.map(t => (
                                            <TaskCard key={t.id} task={t} onToggle={onToggleTask} onClick={onEditTask} />
                                        ))}
                                    </div>
                                 </div>
                             )}

                             <div>
                                <div className="flex items-center gap-3 mb-4">
                                   <div className="w-1.5 h-6 bg-app-primary rounded-full"></div>
                                   <h3 className="text-xl font-bold text-gray-800">
                                      {isToday(selectedDate) ? '今日日程' : `${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日 日程`}
                                   </h3>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {habitTasks.map(t => (
                                        <TaskCard 
                                            key={t.id} 
                                            task={t} 
                                            onToggle={onToggleHabit ? (id) => handleToggleMixed(id) : undefined} 
                                            onClick={handleEditClick} 
                                        />
                                    ))}

                                    {currentDayTasks
                                        .sort((a,b) => {
                                            if(a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
                                            if(a.startTime && !b.startTime) return -1;
                                            if(!a.startTime && b.startTime) return 1;
                                            if(a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
                                            return 0;
                                        })
                                        .map(t => (
                                            <TaskCard key={t.id} task={t} onToggle={onToggleTask} onClick={onEditTask} />
                                        ))
                                    }
                                </div>
                                {currentDayTasks.length === 0 && habitTasks.length === 0 && (
                                    <div className="py-16 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                                        <span className="text-sm font-medium">本日无安排</span>
                                        {isToday(selectedDate) && <span className="text-xs mt-1">从右侧待办池拖入任务，或点击新建</span>}
                                    </div>
                                )}
                             </div>
                        </div>
                    ) : (
                        <div className="h-full">
                           {renderDayTimeline()}
                        </div>
                    )}
                 </>
              )}

              {/* --- WEEK VIEW --- */}
              {viewMode === 'week' && (
                  <>
                    {displayMode === 'list' ? (
                        <div className="h-full overflow-x-auto pb-4 px-8 pt-4">
                            <div className="grid grid-cols-7 gap-3 min-w-[800px] h-full">
                                {weekDays.map((day, i) => {
                                    const dayTasks = tasks.filter(t => t.doDate && isSameDay(new Date(t.doDate), day.date));
                                    dayTasks.sort((a,b) => (a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1));

                                    return (
                                        <div key={i} className={`flex flex-col h-full rounded-2xl p-2 transition-colors ${day.isToday ? 'bg-indigo-50/50 ring-1 ring-indigo-100' : 'bg-gray-50/30'}`}>
                                            <div className="text-center mb-3 py-1">
                                                <div className={`text-[10px] font-bold uppercase mb-1 ${day.isToday ? 'text-app-primary' : 'text-gray-400'}`}>{day.dayName}</div>
                                                <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-bold ${
                                                    day.isToday ? 'bg-app-primary text-white shadow-md shadow-indigo-200' : 'text-gray-700 bg-white shadow-sm'
                                                }`}>
                                                    {day.date.getDate()}
                                                </div>
                                            </div>

                                            <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar pb-10">
                                                {dayTasks.map(t => (
                                                    <TaskCard 
                                                        key={t.id} 
                                                        task={t} 
                                                        variant="compact" 
                                                        onToggle={onToggleTask} 
                                                        onClick={onEditTask} 
                                                    />
                                                ))}
                                                {dayTasks.length === 0 && (
                                                    <div className="h-full flex items-center justify-center opacity-20 hover:opacity-40 transition-opacity group">
                                                        <Plus size={24} className="text-gray-400 group-hover:scale-110 transition-transform" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full">
                            {renderWeekTimeline()}
                        </div>
                    )}
                  </>
              )}

              {/* --- MONTH VIEW --- */}
              {viewMode === 'month' && (
                  <div className="h-full">
                      {renderMonthView()}
                  </div>
              )}
           </div>
       </div>

       {/* --- RIGHT SIDEBAR: BACKLOG POOL --- */}
       <div 
         className={`w-80 h-full flex flex-col border-l bg-white hidden lg:flex transition-colors duration-300 ${isDragOverBacklog ? 'bg-red-50' : ''}`}
         onDragOver={handleBacklogDragOver}
         onDragLeave={handleBacklogDragLeave}
         onDrop={handleBacklogDrop}
       >
           {isDragOverBacklog ? (
              <div className="flex-1 flex flex-col items-center justify-center text-red-400 animate-fade-in space-y-3">
                  <div className="p-5 bg-red-100 rounded-full shadow-inner animate-pulse">
                      <History size={32} strokeWidth={2.5} />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">松开取消安排</p>
                    <p className="text-xs opacity-70">任务将返回待办池</p>
                  </div>
              </div>
           ) : (
               <>
                <div className="flex-none p-6 border-b border-gray-50">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <Inbox size={18} className="text-gray-400" />
                            <h3 className="font-bold text-gray-700">待办池</h3>
                            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-bold">{unscheduledTasks.length}</span>
                        </div>
                        <button
                            onClick={() => setShowCompletedBacklog(!showCompletedBacklog)}
                            className="p-1.5 text-gray-400 hover:text-app-primary hover:bg-indigo-50 rounded-lg transition-colors"
                            title={showCompletedBacklog ? "隐藏已完成" : "显示已完成"}
                        >
                            {showCompletedBacklog ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-400">拖拽任务到时间轴，或点击 <span className="font-bold text-app-primary">←</span> 加入</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar bg-gray-50/30">
                    {unscheduledTasks.length === 0 ? (
                        <div className="text-center py-10 opacity-40">
                            <p className="text-xs">暂无待办任务</p>
                        </div>
                    ) : (
                        unscheduledTasks.map(task => (
                            <div 
                                key={task.id} 
                                draggable
                                onDragStart={(e) => handleDragStart(e, task.id, 'backlog')}
                                onDragEnd={resetDragState}
                                className="group bg-white p-3 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-start gap-3 relative overflow-hidden cursor-grab active:cursor-grabbing active:opacity-60"
                            >
                                <button 
                                        onClick={() => onScheduleTask(task.id, selectedDate)} 
                                        className="absolute left-0 top-0 bottom-0 w-8 bg-indigo-50 text-app-primary flex items-center justify-center -translate-x-full group-hover:translate-x-0 transition-transform duration-200 z-10 hover:bg-app-primary hover:text-white"
                                        title="加入当前选中日期"
                                >
                                    <ArrowLeft size={16} strokeWidth={3} />
                                </button>

                                <div className="flex-1 min-w-0 transition-transform duration-200 group-hover:translate-x-2">
                                    <div className="flex items-center gap-2 mb-1">
                                            {task.category && (
                                                <span className={`w-2 h-2 rounded-full ${task.category.colorBg}`}></span>
                                            )}
                                            <span className="text-[10px] text-gray-400 font-bold truncate">
                                                {task.category ? task.category.name : '无分类'}
                                            </span>
                                    </div>
                                    <h4 className={`text-sm font-bold leading-snug pointer-events-none ${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>{task.title}</h4>
                                </div>
                            </div>
                        ))
                    )}
                </div>
               </>
           )}
       </div>

       {/* --- MOBILE BACKLOG DRAWER --- */}
       {isMobileBacklogOpen && (
           <div className="fixed inset-0 z-50 lg:hidden">
               <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsMobileBacklogOpen(false)}></div>
               <div className="absolute right-0 top-0 bottom-0 w-4/5 max-w-sm bg-white shadow-2xl flex flex-col animate-slide-in-right">
                   <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                       <div className="flex items-center gap-2">
                           <Inbox size={20} className="text-app-primary" />
                           <h3 className="font-bold text-gray-800">待办池</h3>
                           <span className="bg-app-primary/10 text-app-primary text-xs px-2 py-0.5 rounded-full font-bold">{unscheduledTasks.length}</span>
                       </div>
                       <button onClick={() => setIsMobileBacklogOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                           <ChevronRight size={20} className="text-gray-400" />
                       </button>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
                       {unscheduledTasks.length === 0 ? (
                           <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                               <Inbox size={48} className="mb-2 opacity-20" />
                               <p className="text-sm">暂无待办任务</p>
                           </div>
                       ) : (
                           unscheduledTasks.map(task => (
                               <div key={task.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between gap-3">
                                   <div className="flex-1 min-w-0">
                                       <div className="flex items-center gap-2 mb-1">
                                           {task.category && <span className={`w-2 h-2 rounded-full ${task.category.colorBg}`}></span>}
                                           <span className="text-[10px] text-gray-400 font-bold truncate">{task.category?.name || '无分类'}</span>
                                       </div>
                                       <h4 className={`text-sm font-bold truncate ${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>{task.title}</h4>
                                   </div>
                                   <button 
                                       onClick={() => {
                                           onScheduleTask(task.id, selectedDate);
                                           setIsMobileBacklogOpen(false);
                                       }}
                                       className="p-2 bg-indigo-50 text-app-primary rounded-lg hover:bg-app-primary hover:text-white transition-colors"
                                       title="加入当前日期"
                                   >
                                       <ArrowLeft size={18} />
                                   </button>
                               </div>
                           ))
                       )}
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};
