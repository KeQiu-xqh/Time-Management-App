
import React, { useState, useEffect } from 'react';
import { User, Database, Info, Trash2, Save } from 'lucide-react';

interface SettingsModalProps {
  currentName: string;
  onSaveName: (name: string) => void;
  onResetData: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ currentName, onSaveName, onResetData, onClose }) => {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName]);

  const handleSave = () => {
    if (name.trim()) {
      onSaveName(name);
      onClose();
    }
  };

  const handleReset = () => {
    if (window.confirm("确定要清空所有任务和习惯吗？此操作无法撤销，页面将重新加载。")) {
      onResetData();
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
          <User size={16} />
          个人资料
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入昵称..."
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-app-primary/20 focus:border-app-primary outline-none text-gray-800 font-medium"
          />
          <button
            onClick={handleSave}
            disabled={!name.trim() || name === currentName}
            className="px-4 py-2 bg-app-primary text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200"
          >
            <Save size={18} />
          </button>
        </div>
      </section>

      {/* Data Section */}
      <section>
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
          <Database size={16} />
          数据管理
        </h3>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <h4 className="font-bold text-red-600 mb-1">危险区域</h4>
          <p className="text-xs text-red-400 mb-4">这将清空本地所有的任务、习惯和分类数据，重置为初始状态。</p>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-500 rounded-lg text-sm font-bold hover:bg-red-500 hover:text-white hover:border-transparent transition-all"
          >
            <Trash2 size={16} />
            清除所有数据
          </button>
        </div>
      </section>

      {/* About Section */}
      <section className="pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-gray-400">
          <div className="flex items-center gap-2">
            <Info size={16} />
            <span className="text-sm font-medium">版本信息</span>
          </div>
          <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-500">v1.0.0</span>
        </div>
      </section>
    </div>
  );
};
