
import React from 'react';
import { Tab } from '../types';
import { LayoutList, CalendarDays, CheckSquare, Layers, Sparkles } from 'lucide-react';

interface SidebarProps {
  currentTab: Tab;
  onSwitch: (tab: Tab) => void;
  userName?: string;
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSwitch, userName, onOpenSettings }) => {
  const navItems = [
    { id: Tab.Calendar, label: '日程', icon: CalendarDays },
    { id: Tab.Backlog, label: '待办', icon: LayoutList },
    { id: Tab.Habits, label: '习惯', icon: CheckSquare },
    { id: Tab.Categories, label: '分类', icon: Layers },
  ];

  return (
    <div className="h-screen w-64 bg-white border-r border-gray-100 flex flex-col py-8 px-4 flex-shrink-0 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      {/* Logo / Title Area */}
      <div className="flex items-center gap-3 px-4 mb-10">
        <div className="w-10 h-10 bg-app-primary rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 text-white">
            <Sparkles size={20} fill="currentColor" />
        </div>
        <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">My Plan</h1>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Personal Space</p>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => onSwitch(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-app-primary/10 text-app-primary' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <Icon 
                size={20} 
                strokeWidth={isActive ? 2.5 : 2} 
                className={`transition-colors ${isActive ? 'text-app-primary' : 'text-gray-400 group-hover:text-gray-600'}`} 
              />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom User/Settings Placeholder */}
      <div className="mt-auto px-4">
         <div 
            onClick={onOpenSettings}
            className="p-4 bg-gray-50 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-gray-100 transition-colors group"
         >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                {userName ? userName[0].toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-700 truncate group-hover:text-app-primary transition-colors">{userName || 'User Name'}</div>
                <div className="text-xs text-gray-400">点击设置</div>
            </div>
         </div>
      </div>
    </div>
  );
};
