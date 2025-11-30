import React from 'react';
import { Task } from '../types';
import { CalendarX, RefreshCcw } from 'lucide-react';

interface DailyReviewModalProps {
  tasks: Task[];
  onRecycle: (taskIds: string[]) => void;
}

export const DailyReviewModal: React.FC<DailyReviewModalProps> = ({ tasks, onRecycle }) => {
  return (
    <div className="space-y-6">
        <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-4">
                <CalendarX size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">👋 欢迎回来！昨日回顾</h2>
            <p className="text-gray-500 mt-2 text-sm">
                发现了 <span className="font-bold text-orange-500">{tasks.length}</span> 个昨天未完成的任务。
                建议将它们退回待办池，重新安排。
            </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 max-h-60 overflow-y-auto space-y-2">
            {tasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <span className="text-sm font-medium text-gray-700 truncate">{task.title}</span>
                </div>
            ))}
        </div>

        <button 
            onClick={() => onRecycle(tasks.map(t => t.id))}
            className="w-full flex items-center justify-center gap-2 bg-app-primary text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-600 transition-all active:scale-95"
        >
            <RefreshCcw size={18} />
            <span>全部退回待办池</span>
        </button>
    </div>
  );
};
