
import React, { useState, useEffect } from 'react';
import { Category, Task, Habit, RepeatFrequency } from '../types';
import { Calendar as CalendarIcon, Tag, Clock, AlertTriangle, Trash2, Timer, RotateCw, CheckSquare, LayoutList, RefreshCw } from 'lucide-react';

export type UnifiedItemType = 'task' | 'habit';

export interface UnifiedItemData {
    title: string;
    category?: Category;
    // Task specific
    doDate?: Date;
    deadline?: Date;
    startTime?: string;
    duration?: number;
    repeat?: RepeatFrequency;
    // Habit specific
    frequency?: 'daily' | 'weekly';
    defaultTime?: string;
}

interface AddTaskModalProps {
  categories: Record<string, Category>;
  onSave: (type: UnifiedItemType, data: UnifiedItemData) => void;
  onDelete?: (id: string, type: UnifiedItemType) => void;
  onCancel: () => void;
  
  // Context Props
  initialType?: UnifiedItemType; // Default tab
  initialTask?: Task | null;     // Editing a task
  initialHabit?: Habit | null;   // Editing a habit
  defaultCategoryId?: string;    // Contextual category
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ 
  categories, 
  onSave, 
  onDelete,
  onCancel, 
  initialType = 'task',
  initialTask,
  initialHabit,
  defaultCategoryId 
}) => {
  // --- State ---
  const [activeType, setActiveType] = useState<UnifiedItemType>(initialType);
  const [isEditing, setIsEditing] = useState(false);

  // Common Fields
  const [title, setTitle] = useState('');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>('');

  // Task Fields
  const [doDateStr, setDoDateStr] = useState<string>('');
  const [deadlineStr, setDeadlineStr] = useState<string>('');
  const [isTimeSet, setIsTimeSet] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:30'); // New State for End Time
  const [repeat, setRepeat] = useState<RepeatFrequency>('none');

  // Habit Fields
  const [habitFrequency, setHabitFrequency] = useState<'daily' | 'weekly'>('daily');
  const [habitDefaultTime, setHabitDefaultTime] = useState<string>('');

  // --- Helpers ---
  const formatDateToLocal = (date: Date | undefined) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return undefined;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const addMinutesToTime = (time: string, minutes: number) => {
      const [h, m] = time.split(':').map(Number);
      const date = new Date();
      date.setHours(h, m + minutes);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const getDurationInMinutes = (start: string, end: string) => {
      const [h1, m1] = start.split(':').map(Number);
      const [h2, m2] = end.split(':').map(Number);
      return (h2 * 60 + m2) - (h1 * 60 + m1);
  };

  // --- Initialization ---
  useEffect(() => {
    // Determine if we are editing
    if (initialTask) {
        setIsEditing(true);
        setActiveType('task');
        loadTaskData(initialTask);
    } else if (initialHabit) {
        setIsEditing(true);
        setActiveType('habit');
        loadHabitData(initialHabit);
    } else {
        setIsEditing(false);
        setActiveType(initialType);
        resetForm();
        // Context Category
        if (defaultCategoryId) {
             const foundKey = Object.keys(categories).find(key => categories[key].id === defaultCategoryId);
             setSelectedCategoryKey(foundKey || '');
        }
    }
  }, [initialTask, initialHabit, initialType, defaultCategoryId, categories]);

  const loadTaskData = (task: Task) => {
      setTitle(task.title);
      const catKey = Object.keys(categories).find(key => task.category && categories[key].id === task.category.id);
      setSelectedCategoryKey(catKey || '');
      
      setDoDateStr(formatDateToLocal(task.doDate));
      setDeadlineStr(formatDateToLocal(task.deadline));
      
      if (task.startTime) {
          setIsTimeSet(true);
          setStartTime(task.startTime);
          // Calculate End Time
          const duration = task.duration || 30;
          setEndTime(addMinutesToTime(task.startTime, duration));
      } else {
          setIsTimeSet(false);
          setStartTime('09:00');
          setEndTime('09:30');
      }
      setRepeat(task.repeat || 'none');
  };

  const loadHabitData = (habit: Habit) => {
      setTitle(habit.title);
      const catKey = Object.keys(categories).find(key => habit.category && categories[key].id === habit.category.id);
      setSelectedCategoryKey(catKey || '');
      setHabitFrequency(habit.frequency || 'daily');
      setHabitDefaultTime(habit.defaultTime || '');
  };

  const resetForm = () => {
      setTitle('');
      setSelectedCategoryKey('');
      setDoDateStr(formatDateToLocal(new Date())); // Default to today for tasks
      setDeadlineStr('');
      setIsTimeSet(false);
      setStartTime('09:00');
      setEndTime('09:30');
      setRepeat('none');
      setHabitFrequency('daily');
      setHabitDefaultTime('');
  };

  const doDateObj = parseDate(doDateStr);
  const deadlineObj = parseDate(deadlineStr);
  const isConflict = activeType === 'task' && doDateObj && deadlineObj && doDateObj > deadlineObj;
  
  // Time Validation
  const isTimeInvalid = isTimeSet && getDurationInMinutes(startTime, endTime) <= 0;

  // --- Handlers ---
  const handleStartTimeChange = (newStart: string) => {
      const oldDuration = getDurationInMinutes(startTime, endTime);
      setStartTime(newStart);
      // Maintain duration
      if (oldDuration > 0) {
          setEndTime(addMinutesToTime(newStart, oldDuration));
      } else {
          setEndTime(addMinutesToTime(newStart, 30));
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (activeType === 'task' && isTimeSet && isTimeInvalid) return; // Block invalid time

    const category = selectedCategoryKey ? categories[selectedCategoryKey] : undefined;

    const data: UnifiedItemData = {
        title,
        category,
    };

    if (activeType === 'task') {
        data.doDate = parseDate(doDateStr);
        data.deadline = parseDate(deadlineStr);
        if (isTimeSet) {
            data.startTime = startTime;
            data.duration = getDurationInMinutes(startTime, endTime);
        } else {
            data.startTime = undefined;
            data.duration = undefined;
        }
        data.repeat = repeat;
    } else {
        data.frequency = habitFrequency;
        data.defaultTime = habitDefaultTime || undefined;
    }

    onSave(activeType, data);
  };

  const handleDelete = () => {
      if (onDelete) {
          const id = initialTask?.id || initialHabit?.id;
          if (id && window.confirm("确定要删除吗？此操作无法撤销。")) {
              onDelete(id, activeType);
          }
      }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Type Switcher (Only if creating new) */}
      {!isEditing && (
          <div className="flex p-1 bg-gray-100 rounded-xl mb-6 select-none">
              <button
                 type="button"
                 onClick={() => setActiveType('task')}
                 className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                     activeType === 'task' 
                     ? 'bg-white text-gray-800 shadow-sm' 
                     : 'text-gray-500 hover:text-gray-700'
                 }`}
              >
                  <LayoutList size={16} />
                  任务
              </button>
              <button
                 type="button"
                 onClick={() => setActiveType('habit')}
                 className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                     activeType === 'habit' 
                     ? 'bg-white text-app-primary shadow-sm' 
                     : 'text-gray-500 hover:text-gray-700'
                 }`}
              >
                  <CheckSquare size={16} />
                  习惯
              </button>
          </div>
      )}

      {/* Editing Title Indicator */}
      {isEditing && (
          <div className="flex items-center gap-2 mb-6 text-sm font-bold text-gray-400 uppercase tracking-wider">
              {activeType === 'task' ? <LayoutList size={16} /> : <CheckSquare size={16} />}
              {activeType === 'task' ? '编辑任务' : '编辑习惯'}
          </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 flex-1 overflow-y-auto px-1 no-scrollbar pb-1">
        {/* Title Input (Common) */}
        <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
                {activeType === 'task' ? '任务名称' : '习惯名称'}
            </label>
            <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={activeType === 'task' ? "准备做什么？" : "例如：早起、健身..."}
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-app-primary/50 focus:ring-4 focus:ring-app-primary/10 transition-all outline-none text-gray-800 placeholder-gray-400 font-medium"
            autoFocus
            />
        </div>

        {/* Category Select (Common) */}
        <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                <Tag size={16} className="text-gray-400" />
                分类
            </label>
            <select
                value={selectedCategoryKey}
                onChange={(e) => setSelectedCategoryKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-app-primary focus:ring-2 focus:ring-app-primary/10 outline-none text-sm text-gray-700 appearance-none cursor-pointer"
            >
                <option value="">无分类</option>
                {Object.entries(categories).map(([key, cat]) => (
                <option key={key} value={key}>{cat.name}</option>
                ))}
            </select>
        </div>

        {/* --- TASK SPECIFIC FIELDS --- */}
        {activeType === 'task' && (
            <div className="space-y-6 animate-fade-in">
                 <div className="grid grid-cols-2 gap-4">
                    {/* Do Date */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <CalendarIcon size={16} className="text-gray-400" />
                            执行日期
                        </label>
                        <input
                            type="date"
                            value={doDateStr}
                            onChange={(e) => setDoDateStr(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-app-primary focus:ring-2 focus:ring-app-primary/10 outline-none text-sm text-gray-700 font-medium"
                        />
                    </div>
                     {/* Deadline */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                            <Clock size={16} className="text-gray-400" />
                            截止日期
                        </label>
                        <input
                            type="date"
                            value={deadlineStr}
                            onChange={(e) => setDeadlineStr(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-app-primary focus:ring-2 focus:ring-app-primary/10 outline-none text-sm text-gray-700 font-medium"
                        />
                    </div>
                </div>

                {/* Repeat Task */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                        <RotateCw size={16} className="text-gray-400" />
                        重复任务
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {(['none', 'daily', 'weekly', 'monthly'] as const).map(option => {
                            const labels = { none: '不重复', daily: '每天', weekly: '每周', monthly: '每月' };
                            const isSelected = repeat === option;
                            return (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => setRepeat(option)}
                                    className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                                        isSelected 
                                        ? 'bg-indigo-50 text-app-primary border-indigo-100 shadow-sm' 
                                        : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                                    }`}
                                >
                                    {labels[option]}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Time Settings */}
                <div className="bg-gray-50/80 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                            <Timer size={16} className="text-gray-400" />
                            具体时间设置
                        </label>
                        <div 
                            onClick={() => setIsTimeSet(!isTimeSet)}
                            className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${isTimeSet ? 'bg-app-primary' : 'bg-gray-300'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isTimeSet ? 'translate-x-4' : ''}`}></div>
                        </div>
                    </div>

                    {isTimeSet && (
                        <div className="grid grid-cols-2 gap-4 animate-fade-in">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5">开始时间</label>
                                <input 
                                    type="time" 
                                    value={startTime}
                                    onChange={(e) => handleStartTimeChange(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm focus:border-app-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1.5">结束时间</label>
                                <input 
                                    type="time" 
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-lg bg-white border text-sm focus:border-app-primary outline-none ${
                                        isTimeInvalid ? 'border-red-300 text-red-500 bg-red-50' : 'border-gray-200'
                                    }`}
                                />
                            </div>
                        </div>
                    )}
                    
                    {isTimeSet && isTimeInvalid && (
                        <div className="mt-2 text-xs text-red-500 font-bold flex items-center gap-1">
                            <AlertTriangle size={12} />
                            结束时间必须晚于开始时间
                        </div>
                    )}
                </div>

                {isConflict && (
                    <div className="flex items-center gap-1.5 mt-2 text-app-danger animate-fade-in bg-red-50 p-3 rounded-lg">
                        <AlertTriangle size={14} fill="currentColor" className="text-app-danger" stroke="white" />
                        <span className="text-xs font-bold">注意：执行日期晚于截止日期！</span>
                    </div>
                )}
            </div>
        )}

        {/* --- HABIT SPECIFIC FIELDS --- */}
        {activeType === 'habit' && (
             <div className="space-y-6 animate-fade-in">
                <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                        <RefreshCw size={16} className="text-gray-400" />
                        频率设置
                    </label>
                    <div className="flex gap-2">
                         <button
                            type="button"
                            onClick={() => setHabitFrequency('daily')}
                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border ${
                                habitFrequency === 'daily'
                                ? 'bg-orange-50 text-orange-500 border-orange-100 shadow-sm'
                                : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                            }`}
                         >
                             每天
                         </button>
                         <button
                            type="button"
                            onClick={() => setHabitFrequency('weekly')}
                            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border ${
                                habitFrequency === 'weekly'
                                ? 'bg-orange-50 text-orange-500 border-orange-100 shadow-sm'
                                : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                            }`}
                         >
                             每周
                         </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">习惯建立初期，建议每天坚持。</p>
                </div>

                {/* Default Time for Habit */}
                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                        <Clock size={16} className="text-gray-400" />
                        惯用时间 (可选)
                    </label>
                    <div className="flex items-center gap-4">
                        <input 
                            type="time" 
                            value={habitDefaultTime}
                            onChange={(e) => setHabitDefaultTime(e.target.value)}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-sm text-gray-700 font-medium"
                        />
                        {habitDefaultTime && (
                            <button 
                                type="button"
                                onClick={() => setHabitDefaultTime('')}
                                className="text-xs text-gray-400 hover:text-red-400 underline"
                            >
                                清除
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                        {habitDefaultTime 
                            ? "该习惯将自动显示在日程时间轴的指定时间点。" 
                            : "留空则显示在顶部的“全天 & 习惯”区域。"}
                    </p>
                </div>
             </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
             <div>
                {isEditing && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="flex items-center gap-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors text-sm font-bold"
                    >
                        <Trash2 size={16} />
                        <span>删除</span>
                    </button>
                )}
            </div>

            <div className="flex items-center gap-3">
                <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 rounded-xl text-gray-500 font-bold hover:bg-gray-50 transition-colors"
                >
                取消
                </button>
                <button
                type="submit"
                disabled={!title.trim()}
                className={`px-6 py-2.5 rounded-xl text-white font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none ${
                    isConflict 
                    ? 'bg-red-500 shadow-red-200' 
                    : activeType === 'habit' ? 'bg-orange-400 shadow-orange-200' : 'bg-app-primary'
                }`}
                >
                {isEditing ? '保存修改' : (isConflict ? '强行创建' : `创建${activeType === 'task' ? '任务' : '习惯'}`)}
                </button>
            </div>
        </div>
      </form>
    </div>
  );
};
