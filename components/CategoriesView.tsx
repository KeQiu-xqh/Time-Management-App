
import React, { useState } from 'react';
import { Category, Task, Habit } from '../types';
import { CATEGORY_COLORS } from '../constants';
import { TaskCard } from './TaskCard';
import { Layers, Plus, Trash2, Search, RefreshCw, Flame } from 'lucide-react';
import { UnifiedItemType } from './AddTaskModal';

interface CategoriesViewProps {
  categories: Record<string, Category>;
  tasks: Task[];
  habits: Habit[];
  onToggleTask: (id: string) => void;
  onAddCategory: (name: string, colorBg: string, colorText: string) => void;
  onDeleteCategory: (id: string) => void;
  onEditTask: (task: Task) => void;
  onEditHabit: (habit: Habit) => void;
  onOpenCreator: (type: UnifiedItemType, categoryId?: string) => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({ 
  categories, 
  tasks,
  habits,
  onToggleTask,
  onAddCategory, 
  onDeleteCategory,
  onEditTask,
  onEditHabit,
  onOpenCreator
}) => {
  const [activeCategoryId, setActiveCategoryId] = useState<string>('ALL');
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  // --- Filter Logic ---
  const filteredTasks = tasks.filter(task => {
    if (activeCategoryId === 'ALL') return true;
    return task.category?.id === activeCategoryId;
  }).sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    const dateA = a.doDate || a.deadline || new Date(2100, 0, 1);
    const dateB = b.doDate || b.deadline || new Date(2100, 0, 1);
    return dateA.getTime() - dateB.getTime();
  });

  const activeTasks = filteredTasks.filter(t => !t.isCompleted);
  const completedTasks = filteredTasks.filter(t => t.isCompleted);

  const filteredHabits = habits.filter(habit => {
      if (activeCategoryId === 'ALL') return true;
      return habit.category?.id === activeCategoryId;
  });

  // --- Handlers ---
  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const color = CATEGORY_COLORS[selectedColorIndex];
    onAddCategory(newCatName, color.bg, color.text);
    setNewCatName('');
    setIsAddingCat(false);
  };

  const handleDeleteCurrent = () => {
    if (activeCategoryId === 'ALL') return;
    if (window.confirm('确定要删除这个分类吗？相关任务的分类标记将被移除。')) {
        onDeleteCategory(activeCategoryId);
        setActiveCategoryId('ALL');
    }
  };

  const handleCreateInContext = () => {
      const catId = activeCategoryId === 'ALL' ? undefined : activeCategoryId;
      onOpenCreator('task', catId); // Default to task, but modal allows switch
  };

  return (
    <div className="pb-24 relative min-h-full">
       {/* Header */}
      <div className="sticky top-0 bg-app-bg/95 backdrop-blur-sm z-40 pt-8 pb-2 px-8 border-b border-gray-100/50">
        <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                <Layers size={28} />
            </div>
            <div>
                <h2 className="text-3xl font-bold text-gray-800">分类视图</h2>
                <p className="text-gray-400 font-medium">按维度查看任务全貌。</p>
            </div>
        </div>

        {/* Tab Bar - Horizontal Scroll */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
            {/* 'ALL' Tab */}
            <button
                onClick={() => setActiveCategoryId('ALL')}
                className={`flex-shrink-0 px-5 py-2 rounded-full font-bold text-sm transition-all border ${
                    activeCategoryId === 'ALL'
                    ? 'bg-gray-800 text-white border-gray-800 shadow-lg shadow-gray-200'
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
            >
                全部
            </button>

            {/* Category Tabs */}
            {Object.values(categories).map(cat => {
                const isActive = activeCategoryId === cat.id;
                return (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategoryId(cat.id)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-sm transition-all border flex items-center gap-2 ${
                            isActive
                            ? `${cat.colorBg} ${cat.colorText} border-transparent shadow-md`
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {cat.name}
                        {isActive && (
                            <div 
                                onClick={(e) => { e.stopPropagation(); handleDeleteCurrent(); }}
                                className="p-0.5 rounded-full hover:bg-black/10 transition-colors"
                            >
                                <Trash2 size={12} strokeWidth={3} />
                            </div>
                        )}
                    </button>
                );
            })}

            {/* Add Category Button */}
            <button
                onClick={() => setIsAddingCat(!isAddingCat)}
                className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    isAddingCat ? 'bg-gray-200 text-gray-600 rotate-45' : 'bg-gray-100 text-gray-500 hover:bg-app-primary hover:text-white'
                }`}
                title="添加新分类"
            >
                <Plus size={20} />
            </button>
        </div>

        {/* Inline Add Category Form */}
        {isAddingCat && (
            <div className="mt-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-fade-in-up">
                <form onSubmit={handleAddCategorySubmit} className="flex flex-col md:flex-row gap-4 items-center">
                    <input
                        autoFocus
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="新分类名称..."
                        className="flex-1 w-full px-4 py-2 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-app-primary/20"
                    />
                    <div className="flex gap-2">
                         {CATEGORY_COLORS.slice(0, 5).map((color, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedColorIndex(idx)}
                                className={`w-6 h-6 rounded-full ${color.bg} border-2 transition-all ${selectedColorIndex === idx ? 'border-gray-800 scale-125' : 'border-transparent'}`}
                            />
                        ))}
                    </div>
                    <button 
                        type="submit" 
                        disabled={!newCatName.trim()}
                        className="px-6 py-2 bg-app-primary text-white rounded-xl font-bold text-sm disabled:opacity-50"
                    >
                        确认添加
                    </button>
                </form>
            </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="px-8 pt-6 max-w-5xl space-y-10">
        
        {/* --- 1. Habits Section (Top) --- */}
        {filteredHabits.length > 0 && (
            <section className="animate-fade-in-up">
                <div className="flex items-center gap-2 mb-4">
                   <RefreshCw size={18} className="text-orange-500" />
                   <h3 className="text-lg font-bold text-gray-800">长期习惯 <span className="text-sm font-normal text-gray-400">Habits</span></h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredHabits.map(habit => (
                        <div 
                            key={habit.id} 
                            onClick={() => onEditHabit(habit)}
                            className="group bg-white rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-transparent hover:border-orange-200 transition-all flex items-center gap-4 cursor-pointer active:scale-95"
                        >
                             <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-orange-500 bg-orange-50 group-hover:bg-orange-100 transition-colors`}>
                                 <RefreshCw size={20} />
                             </div>
                             <div className="flex-1 min-w-0">
                                 <h4 className="font-bold text-gray-800 truncate mb-1">{habit.title}</h4>
                                 <div className="flex items-center gap-1.5 text-xs font-medium text-orange-500">
                                     <Flame size={12} fill="currentColor" />
                                     <span>已坚持 {habit.streak} 天</span>
                                 </div>
                             </div>
                        </div>
                    ))}
                </div>
            </section>
        )}

        {/* --- 2. Tasks Section (Bottom) --- */}
        <section className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {/* Show header only if habits exist to distinguish sections */}
            {filteredHabits.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                   <Layers size={18} className="text-gray-500" />
                   <h3 className="text-lg font-bold text-gray-800">待办任务 <span className="text-sm font-normal text-gray-400">Tasks</span></h3>
                </div>
            )}
            
            {filteredTasks.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-12 text-gray-400 opacity-60 rounded-2xl ${filteredHabits.length === 0 ? 'bg-gray-50 border-2 border-dashed border-gray-100' : ''}`}>
                    <Search size={32} className="mb-2 text-gray-300" />
                    <p>暂无任务</p>
                </div>
            ) : (
                <>
                    {/* Active Tasks */}
                    {activeTasks.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeTasks.map(task => (
                                <TaskCard 
                                    key={task.id} 
                                    task={task} 
                                    onToggle={onToggleTask} 
                                    onClick={onEditTask} 
                                />
                            ))}
                        </div>
                    )}

                    {/* Completed Divider */}
                    {completedTasks.length > 0 && (
                        <div className="pt-4">
                            {activeTasks.length > 0 && (
                                <div className="flex items-center gap-4 mb-6 opacity-50">
                                    <div className="h-px bg-gray-300 flex-1"></div>
                                    <span className="text-xs font-bold text-gray-400">已完成</span>
                                    <div className="h-px bg-gray-300 flex-1"></div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50 hover:opacity-100 transition-opacity">
                                {completedTasks.map(task => (
                                    <TaskCard 
                                        key={task.id} 
                                        task={task} 
                                        onToggle={onToggleTask} 
                                        onClick={onEditTask} 
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </section>
      </div>

      {/* Context-Aware Add Button */}
      <div className="fixed bottom-24 right-8 z-50">
          <button
            onClick={handleCreateInContext}
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-xl shadow-gray-300 hover:scale-105 hover:bg-black transition-all active:scale-95"
          >
            <Plus size={20} />
            <span className="font-bold text-sm">
                新建
            </span>
          </button>
      </div>
    </div>
  );
};
