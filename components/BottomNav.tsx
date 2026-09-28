import React from 'react';
import { Tab } from '../types';
import { LayoutList, CalendarDays, CheckSquare, Layers, User } from 'lucide-react';

interface BottomNavProps {
  currentTab: Tab;
  onSwitch: (tab: Tab) => void;
  onOpenSettings: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSwitch, onOpenSettings }) => {
  const navItems = [
    { id: Tab.Backlog, label: '待办', icon: LayoutList },
    { id: Tab.Calendar, label: '日程', icon: CalendarDays },
    { id: Tab.Habits, label: '习惯', icon: CheckSquare },
    { id: Tab.Categories, label: '分类', icon: Layers },
  ];

  return (
    <div className="bottom-nav md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-3 flex justify-between items-center z-50 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
      {navItems.map((item) => {
        const isActive = currentTab === item.id;
        const Icon = item.icon;
        
        return (
          <button
            key={item.id}
            onClick={() => onSwitch(item.id)}
            className="bottom-nav-item flex flex-col items-center justify-center transition-all duration-300"
          >
            <div className={`bottom-nav-icon transition-all duration-300 ${isActive ? 'bg-app-primary text-white shadow-md shadow-indigo-200' : 'text-gray-400 hover:bg-gray-50'}`}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`bottom-nav-label font-medium transition-colors ${isActive ? 'text-app-primary' : 'text-gray-400'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
      
      {/* Settings / Me Tab */}
      <button
        onClick={onOpenSettings}
        className="bottom-nav-item flex flex-col items-center justify-center transition-all duration-300"
      >
        <div className="bottom-nav-icon text-gray-400 hover:bg-gray-50 transition-all duration-300">
          <User size={20} strokeWidth={2} />
        </div>
        <span className="bottom-nav-label font-medium text-gray-400">
          我的
        </span>
      </button>
    </div>
  );
};
