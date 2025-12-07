import React from 'react';
import { Tab } from '../types';
import { LayoutList, CalendarDays, CheckSquare, Layers } from 'lucide-react';

interface BottomNavProps {
  currentTab: Tab;
  onSwitch: (tab: Tab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSwitch }) => {
  const navItems = [
    { id: Tab.Backlog, label: '待办', icon: LayoutList },
    { id: Tab.Calendar, label: '日程', icon: CalendarDays },
    { id: Tab.Habits, label: '习惯', icon: CheckSquare },
    { id: Tab.Categories, label: '分类', icon: Layers },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-2 pb-6 flex justify-between items-center z-50 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
      {navItems.map((item) => {
        const isActive = currentTab === item.id;
        const Icon = item.icon;
        
        return (
          <button
            key={item.id}
            onClick={() => onSwitch(item.id)}
            className="flex flex-col items-center gap-1 min-w-[64px] transition-all duration-300"
          >
            <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-app-primary text-white shadow-lg shadow-indigo-200' : 'text-gray-400 hover:bg-gray-50'}`}>
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-app-primary' : 'text-gray-400'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
