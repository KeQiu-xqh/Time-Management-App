
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Tab, Task, Category, Habit, RepeatFrequency } from './types';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { CalendarView } from './components/CalendarView';
import { BacklogView } from './components/BacklogView';
import { HabitsView } from './components/HabitsView';
import { CategoriesView } from './components/CategoriesView';
import { Modal } from './components/Modal';
import { AddTaskModal, UnifiedItemType, UnifiedItemData } from './components/AddTaskModal';
import { DailyReviewModal } from './components/DailyReviewModal';
import { SettingsModal } from './components/SettingsModal';
import { useVisibleViewport } from './components/useVisibleViewport';
import './components/MobileUI.css';
import { nextRepeatTask, rescheduleTask } from './components/recurrence';
import { dateKey } from './components/calendarGesture';
import { emptySnapshot, type PlanSnapshot } from './data/planSnapshot';
import { usePlanPersistence } from './data/usePlanPersistence';
import { useCloudSync } from './sync/useCloudSync';

const DEFAULT_CATEGORIES: Record<string, Category> = {};

const App: React.FC = () => {
  useVisibleViewport();
  // --- 1. Centralized State Management ---
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Calendar);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Edit / Create State (Unified)
  const [modalInitialType, setModalInitialType] = useState<UnifiedItemType>('task');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [initialCategoryForNewItem, setInitialCategoryForNewItem] = useState<string | undefined>(undefined);

  // Daily Review State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewTasks, setReviewTasks] = useState<Task[]>([]);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userName, setUserName] = useState<string>(() => emptySnapshot().username);

  // Data State
  const [categories, setCategories] = useState<Record<string, Category>>(DEFAULT_CATEGORIES);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const snapshot = useMemo<PlanSnapshot>(() => ({
    version: 1,
    categories,
    tasks,
    habits,
    username: userName
  }), [categories, tasks, habits, userName]);
  const persistence = usePlanPersistence(snapshot, {
    setCategories,
    setTasks,
    setHabits,
    setUserName
  });
  const cloudSync = useCloudSync(snapshot, persistence.importSnapshot);
  const didRunDailyReview = useRef(false);

  // --- 3. Daily Review Logic ---
  useEffect(() => {
    if (!persistence.ready || didRunDailyReview.current) return;
    didRunDailyReview.current = true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredTasks = tasks.filter(t => {
      if (!t.doDate || t.isCompleted) return false;
      const tDate = new Date(t.doDate);
      tDate.setHours(0, 0, 0, 0);
      return tDate < today;
    });

    if (expiredTasks.length > 0) {
      setReviewTasks(expiredTasks);
      setIsReviewModalOpen(true);
    }
  }, [persistence.ready, tasks]);

  // --- 4. Action Handlers ---

  const handleResetData = () => persistence.resetData();

  // Unified Opener
  const handleOpenCreator = (type: UnifiedItemType = 'task', categoryId?: string) => {
      setEditingTask(null);
      setEditingHabit(null);
      setModalInitialType(type);
      setInitialCategoryForNewItem(categoryId);
      setIsModalOpen(true);
  };

  const handleOpenEditTask = (task: Task) => {
    setEditingTask(task);
    setEditingHabit(null);
    setModalInitialType('task');
    setInitialCategoryForNewItem(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setEditingTask(null);
    setModalInitialType('habit');
    setInitialCategoryForNewItem(undefined);
    setIsModalOpen(true);
  }

  // Unified Save Handler
  const handleSaveItem = (type: UnifiedItemType, data: UnifiedItemData) => {
      if (type === 'task') {
          handleSaveTask(data);
      } else {
          handleSaveHabit(data);
      }
      setIsModalOpen(false);
  };

  const handleSaveTask = (taskData: UnifiedItemData) => {
    if (editingTask) {
      // Update Existing
      setTasks(prev => prev.map(t => 
        t.id === editingTask.id 
          ? { ...t, ...taskData } as Task
          : t
      ));
    } else {
      // Create New
      const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        title: taskData.title,
        isCompleted: false,
        category: taskData.category,
        doDate: taskData.doDate,
        deadline: taskData.deadline,
        startTime: taskData.startTime,
        duration: taskData.duration,
        repeat: taskData.repeat,
        repeatRule: taskData.repeatRule,
        repeatAnchorDate: taskData.repeatAnchorDate
      };
      setTasks(prev => [...prev, newTask]);

      // Auto-switch logic
      if (activeTab !== Tab.Categories) { 
          if (taskData.doDate) {
            setActiveTab(Tab.Calendar);
          } else {
            setActiveTab(Tab.Backlog);
          }
      }
    }
  };

  const handleSaveHabit = (habitData: UnifiedItemData) => {
      if (editingHabit) {
          // Update Existing
          setHabits(prev => prev.map(h => 
            h.id === editingHabit.id 
            ? { ...h, title: habitData.title, category: habitData.category, frequency: habitData.frequency }
            : h
          ));
      } else {
          // Create New
          const newHabit: Habit = {
            id: Math.random().toString(36).substr(2, 9),
            title: habitData.title,
            category: habitData.category,
            frequency: habitData.frequency,
            completedDates: [],
            streak: 0
          };
          setHabits(prev => [...prev, newHabit]);
          
          if (activeTab !== Tab.Categories) {
              setActiveTab(Tab.Habits);
          }
      }
  };

  // Unified Delete Handler
  const handleDeleteItem = (id: string, type: UnifiedItemType) => {
      if (type === 'task') {
          setTasks(prev => prev.filter(t => t.id !== id));
      } else {
          setHabits(prev => prev.filter(h => h.id !== id));
      }
      setIsModalOpen(false);
  };

  // Habit Toggle Logic
  const handleToggleHabit = (id: string, dateStr: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h;

      const isAlreadyCompleted = h.completedDates.includes(dateStr);
      
      const newDates = isAlreadyCompleted 
        ? h.completedDates.filter(d => d !== dateStr)
        : [...h.completedDates, dateStr];
      
      // Calculate Streak
      const sortedDates = [...new Set(newDates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      let streak = 0;
      const today = new Date();
      today.setHours(0,0,0,0);
      const todayStr = dateKey(today);

      let checkDate = new Date(today);
      let currentAnchor: Date | null = null;

      if (sortedDates.includes(todayStr)) {
        currentAnchor = new Date(today);
      } else {
         const yesterday = new Date(today);
         yesterday.setDate(yesterday.getDate() - 1);
         const yesterdayStr = dateKey(yesterday);
         if (sortedDates.includes(yesterdayStr)) {
            currentAnchor = yesterday;
         }
      }

      if (currentAnchor) {
         while (true) {
            const str = dateKey(currentAnchor);
            if (sortedDates.includes(str)) {
                streak++;
                currentAnchor.setDate(currentAnchor.getDate() - 1);
            } else {
                break;
            }
         }
      }

      return { ...h, completedDates: newDates, streak };
    }));
  };

  // Task Toggle Logic
  const handleToggleTask = (id: string) => {
    setTasks(prev => {
      const taskToToggle = prev.find(t => t.id === id);
      if (!taskToToggle) return prev;

      const wasCompleted = taskToToggle.isCompleted;
      const isNowCompleted = !wasCompleted;

      // --- Sync Habit if applicable ---
      if (taskToToggle.originalHabitId && isNowCompleted && taskToToggle.doDate) {
          const dateStr = dateKey(new Date(taskToToggle.doDate));
          setTimeout(() => {
              const habit = habits.find(h => h.id === taskToToggle.originalHabitId);
              if (habit && !habit.completedDates.includes(dateStr)) {
                  handleToggleHabit(habit.id, dateStr);
              }
          }, 0);
      }

      let nextTasks = prev.map(t => 
        t.id === id ? { ...t, isCompleted: isNowCompleted } : t
      );

      if (isNowCompleted) {
          const nextTask = nextRepeatTask(taskToToggle, prev);
          if (nextTask) nextTasks = [...nextTasks, nextTask];
      }

      return nextTasks;
    });
  };

  const handleQuickPlan = (id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? rescheduleTask(t, new Date()) : t
    ));
    setActiveTab(Tab.Calendar);
  };

  const handleScheduleTask = (id: string, date: Date, startTime?: string | null, duration?: number) => {
      setTasks(prev => prev.map(t => t.id === id ? rescheduleTask(t, date, startTime, duration) : t));
  };

  // Convert Habit Dragged to Timeline into a Task Instance
  const handleConvertHabitToTask = (habitId: string, date: Date, startTime: string) => {
      const habit = habits.find(h => h.id === habitId);
      if (!habit) return;

      const newTask: Task = {
          id: 'instance_' + Math.random().toString(36).substr(2, 9),
          title: habit.title,
          isCompleted: false,
          category: habit.category,
          doDate: date,
          startTime: startTime,
          duration: 30, // Default duration
          repeat: 'none', // The instance doesn't repeat, the habit does
          originalHabitId: habit.id // Link back
      };

      setTasks(prev => [...prev, newTask]);
  };

  const handleUnscheduleTask = (id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, doDate: undefined, startTime: undefined } : t
    ));
  };

  const handleRecycleTasks = (taskIds: string[]) => {
    setTasks(prev => prev.map(t => 
      taskIds.includes(t.id) ? { ...t, doDate: undefined, startTime: undefined } : t
    ));
    setIsReviewModalOpen(false);
    setActiveTab(Tab.Backlog);
  };

  // Category Actions
  const handleAddCategory = (name: string, colorBg: string, colorText: string) => {
    const id = 'c_' + Math.random().toString(36).substr(2, 9);
    setCategories(prev => ({
      ...prev,
      [id]: { id, name, colorBg, colorText }
    }));
  };

  const handleDeleteCategory = (id: string) => {
    setCategories(prev => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
  };

  const handleEditCategory = (id: string, name: string, colorBg: string, colorText: string) => {
      const updatedCat: Category = { id, name, colorBg, colorText };
      
      // 1. Update Categories
      setCategories(prev => ({
          ...prev,
          [id]: updatedCat
      }));

      // 2. Update Tasks (if they hold a copy)
      setTasks(prev => prev.map(t => 
          t.category?.id === id ? { ...t, category: updatedCat } : t
      ));

      // 3. Update Habits (if they hold a copy)
      setHabits(prev => prev.map(h => 
          h.category?.id === id ? { ...h, category: updatedCat } : h
      ));
  };

  const handleClearCompletedTasks = () => {
      setTasks(prev => prev.filter(t => !t.isCompleted));
  };

  // --- 5. Render Router ---
  const renderContent = () => {
    switch (activeTab) {
      case Tab.Calendar:
        return (
          <CalendarView 
            tasks={tasks} 
            habits={habits} 
            onToggleTask={handleToggleTask} 
            onToggleHabit={handleToggleHabit} 
            onAddTask={() => handleOpenCreator('task')} 
            onEditTask={handleOpenEditTask}
            onEditHabit={handleOpenEditHabit} 
            onScheduleTask={handleScheduleTask}
            onUnscheduleTask={handleUnscheduleTask}
            onConvertHabitToTask={handleConvertHabitToTask}
          />
        );
      case Tab.Backlog:
        return (
          <BacklogView 
            tasks={tasks} 
            onToggleTask={handleToggleTask} 
            onQuickAdd={handleQuickPlan} 
            onEditTask={handleOpenEditTask}
          />
        );
      case Tab.Habits:
        return (
          <HabitsView 
            habits={habits} 
            categories={categories}
            onToggleHabit={handleToggleHabit} 
            onOpenCreator={() => handleOpenCreator('habit')}
            onEditHabit={handleOpenEditHabit}
          />
        );
      case Tab.Categories:
        return (
          <CategoriesView 
            categories={categories} 
            tasks={tasks}
            habits={habits}
            onToggleTask={handleToggleTask}
            onAddCategory={handleAddCategory} 
            onDeleteCategory={handleDeleteCategory}
            onEditCategory={handleEditCategory}
            onEditTask={handleOpenEditTask}
            onEditHabit={handleOpenEditHabit}
            onOpenCreator={handleOpenCreator}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-[100dvh] bg-app-bg text-app-text font-sans selection:bg-indigo-100 overflow-hidden">
      {!persistence.ready && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-white/90 text-sm font-bold text-gray-500">
          正在加载本地计划…
        </div>
      )}
      {persistence.error && (
        <div className="fixed left-1/2 top-3 z-[90] max-w-[calc(100%-24px)] -translate-x-1/2 rounded-xl bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800 shadow-lg ring-1 ring-amber-200">
          本地数据库暂时不可用，已载入兼容备份：{persistence.error}
        </div>
      )}
      <Sidebar 
        currentTab={activeTab} 
        onSwitch={setActiveTab} 
        userName={userName}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <main className="flex-1 min-w-0 h-full overflow-hidden bg-app-bg relative flex flex-col">
        {activeTab === Tab.Calendar ? (
           <div className="flex-1 min-h-0 w-full overflow-hidden pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-0">
              {renderContent()}
           </div>
        ) : (
           <div className="h-full w-full overflow-y-auto no-scrollbar pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-0">
              <div className="max-w-7xl mx-auto min-h-full">
                {renderContent()}
              </div>
           </div>
        )}
      </main>
      
      <BottomNav 
        currentTab={activeTab} 
        onSwitch={setActiveTab} 
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Unified Entry Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? "编辑任务" : editingHabit ? "编辑习惯" : "新建"}
      >
        <AddTaskModal 
          categories={categories} 
          onSave={handleSaveItem} 
          onDelete={handleDeleteItem}
          onCancel={() => setIsModalOpen(false)} 
          initialType={modalInitialType}
          initialTask={editingTask}
          initialHabit={editingHabit}
          defaultCategoryId={initialCategoryForNewItem}
        />
      </Modal>

      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title=""
      >
        <DailyReviewModal 
          tasks={reviewTasks} 
          onRecycle={handleRecycleTasks} 
        />
      </Modal>

      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="设置"
      >
        <SettingsModal 
            currentName={userName}
            snapshot={snapshot}
            sync={cloudSync}
            onSaveName={setUserName}
            onImportSnapshot={persistence.importSnapshot}
            onResetData={handleResetData}
            onClearCompleted={handleClearCompletedTasks}
            onClose={() => setIsSettingsOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default App;
