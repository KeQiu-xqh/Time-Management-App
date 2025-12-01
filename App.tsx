
import React, { useState, useEffect } from 'react';
import { Tab, Task, Category, Habit, RepeatFrequency } from './types';
import { Sidebar } from './components/Sidebar';
import { CalendarView } from './components/CalendarView';
import { BacklogView } from './components/BacklogView';
import { HabitsView } from './components/HabitsView';
import { CategoriesView } from './components/CategoriesView';
import { Modal } from './components/Modal';
import { AddTaskModal, UnifiedItemType, UnifiedItemData } from './components/AddTaskModal';
import { DailyReviewModal } from './components/DailyReviewModal';
import { SettingsModal } from './components/SettingsModal';

// --- Utility: Date Reviver for JSON.parse ---
const dateReviver = (key: string, value: any) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value);
  }
  return value;
};

const DEFAULT_CATEGORIES: Record<string, Category> = {};

const App: React.FC = () => {
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
  const [userName, setUserName] = useState<string>(() => {
      return localStorage.getItem('planflow_username') || 'Guest User';
  });

  // Data State
  const [categories, setCategories] = useState<Record<string, Category>>(() => {
    try {
      const saved = localStorage.getItem('planflow_categories');
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    } catch (e) {
      console.error("Failed to load categories", e);
      return DEFAULT_CATEGORIES;
    }
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('planflow_tasks');
      return saved ? JSON.parse(saved, dateReviver) : [];
    } catch (e) {
      console.error("Failed to load tasks", e);
      return [];
    }
  });

  const [habits, setHabits] = useState<Habit[]>(() => {
    try {
      const saved = localStorage.getItem('planflow_habits');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load habits", e);
      return [];
    }
  });

  // --- 2. Persistence Effects ---
  useEffect(() => {
    localStorage.setItem('planflow_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('planflow_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('planflow_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('planflow_username', userName);
  }, [userName]);

  // --- 3. Daily Review Logic ---
  useEffect(() => {
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
  }, []);

  // --- 4. Action Handlers ---

  const handleResetData = () => {
      localStorage.clear();
      window.location.reload();
  };

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
        repeat: taskData.repeat
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
      const todayStr = today.toISOString().split('T')[0];

      let checkDate = new Date(today);
      let currentAnchor: Date | null = null;

      if (sortedDates.includes(todayStr)) {
        currentAnchor = new Date(today);
      } else {
         const yesterday = new Date(today);
         yesterday.setDate(yesterday.getDate() - 1);
         const yesterdayStr = yesterday.toISOString().split('T')[0];
         if (sortedDates.includes(yesterdayStr)) {
            currentAnchor = yesterday;
         }
      }

      if (currentAnchor) {
         while (true) {
            const str = currentAnchor.toISOString().split('T')[0];
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
          const dateStr = new Date(taskToToggle.doDate).toISOString().split('T')[0];
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

      // Recurring Logic
      if (
          isNowCompleted && 
          taskToToggle.repeat && 
          taskToToggle.repeat !== 'none' && 
          taskToToggle.doDate
      ) {
          const nextDate = new Date(taskToToggle.doDate);
          if (taskToToggle.repeat === 'daily') nextDate.setDate(nextDate.getDate() + 1);
          else if (taskToToggle.repeat === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          else if (taskToToggle.repeat === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

          let nextDeadline = undefined;
          if (taskToToggle.deadline) {
             const d = new Date(taskToToggle.deadline);
             if (taskToToggle.repeat === 'daily') d.setDate(d.getDate() + 1);
             else if (taskToToggle.repeat === 'weekly') d.setDate(d.getDate() + 7);
             else if (taskToToggle.repeat === 'monthly') d.setMonth(d.getMonth() + 1);
             nextDeadline = d;
          }

          const nextTask: Task = {
              ...taskToToggle,
              id: Math.random().toString(36).substr(2, 9),
              isCompleted: false,
              doDate: nextDate,
              deadline: nextDeadline,
          };

          nextTasks = [...nextTasks, nextTask];
      }

      return nextTasks;
    });
  };

  const handleQuickPlan = (id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, doDate: new Date() } : t
    ));
    setActiveTab(Tab.Calendar);
  };

  const handleScheduleTask = (id: string, date: Date, startTime?: string | null) => {
      setTasks(prev => prev.map(t => {
        if (t.id !== id) return t;
        const updates: Partial<Task> = { doDate: date };
        if (startTime !== undefined) {
            updates.startTime = startTime === null ? undefined : startTime;
        }
        return { ...t, ...updates };
      }));
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
    <div className="flex h-screen bg-app-bg text-app-text font-sans selection:bg-indigo-100 overflow-hidden">
      <Sidebar 
        currentTab={activeTab} 
        onSwitch={setActiveTab} 
        userName={userName}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <main className="flex-1 h-full overflow-y-auto bg-app-bg relative no-scrollbar">
        <div className="max-w-7xl mx-auto min-h-full">
          {renderContent()}
        </div>
      </main>

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
            onSaveName={setUserName}
            onResetData={handleResetData}
            onClose={() => setIsSettingsOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default App;
