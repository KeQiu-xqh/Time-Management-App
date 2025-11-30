
import React, { useState } from 'react';
import { Category } from '../types';
import { Tag } from 'lucide-react';

interface AddHabitModalProps {
  categories: Record<string, Category>;
  onSave: (title: string, category?: Category) => void;
  onCancel: () => void;
}

export const AddHabitModal: React.FC<AddHabitModalProps> = ({ categories, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const category = selectedCategoryKey ? categories[selectedCategoryKey] : undefined;
    onSave(title, category);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">习惯名称</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：早起、健身..."
          className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-app-primary/50 focus:ring-4 focus:ring-app-primary/10 transition-all outline-none text-gray-800 placeholder-gray-400 font-medium"
          autoFocus
        />
      </div>

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
        <p className="mt-2 text-xs text-gray-400">选择一个领域，长期投资自己。</p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
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
          className="px-6 py-2.5 rounded-xl bg-app-primary text-white font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
        >
          开始习惯
        </button>
      </div>
    </form>
  );
};
