
import React, { useState, useEffect, useRef } from 'react';
import { User, Database, Info, Trash2, Save, Download, Upload } from 'lucide-react';

interface SettingsModalProps {
  currentName: string;
  onSaveName: (name: string) => void;
  onResetData: () => void;
  onClearCompleted: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ currentName, onSaveName, onResetData, onClearCompleted, onClose }) => {
  const [name, setName] = useState(currentName);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleClearCompleted = () => {
      if (window.confirm("确定要删除所有已完成的任务吗？此操作不可恢复。（习惯数据将保留）")) {
          onClearCompleted();
          alert("已完成任务清理完毕！");
      }
  };

  const handleExport = () => {
    const data = {
      categories: localStorage.getItem('planflow_categories'),
      tasks: localStorage.getItem('planflow_tasks'),
      habits: localStorage.getItem('planflow_habits'),
      username: localStorage.getItem('planflow_username'),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    a.download = `planflow_backup_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // Basic validation
        if (!data.tasks && !data.habits && !data.categories) {
            throw new Error("Invalid backup file format");
        }

        if (window.confirm("这将覆盖当前的所有数据，确定要恢复备份吗？")) {
            if (data.categories) localStorage.setItem('planflow_categories', data.categories);
            if (data.tasks) localStorage.setItem('planflow_tasks', data.tasks);
            if (data.habits) localStorage.setItem('planflow_habits', data.habits);
            if (data.username) localStorage.setItem('planflow_username', data.username);
            
            alert("恢复成功！页面即将刷新。");
            window.location.reload();
        }
      } catch (err) {
        alert("无法解析备份文件，请确保文件格式正确。");
        console.error(err);
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
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

        {/* Backup & Restore */}
        <div className="grid grid-cols-2 gap-3 mb-4">
            <button 
                onClick={handleExport}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-indigo-50 text-app-primary rounded-xl border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 transition-all group"
            >
                <div className="p-2 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    <Download size={20} />
                </div>
                <span className="text-xs font-bold">导出备份</span>
            </button>

            <button 
                onClick={handleImportClick}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-gray-50 text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all group"
            >
                <div className="p-2 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    <Upload size={20} />
                </div>
                <span className="text-xs font-bold">恢复备份</span>
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json" 
                className="hidden" 
            />
        </div>

        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <h4 className="font-bold text-red-600 mb-1">危险区域</h4>
          <p className="text-xs text-red-400 mb-4">管理您的数据存储。</p>
          
          <div className="space-y-3">
              <button
                onClick={handleClearCompleted}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-500 rounded-lg text-sm font-bold hover:bg-red-50 transition-all"
              >
                <Trash2 size={16} />
                🧹 清理已完成任务
              </button>

              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-500 rounded-lg text-sm font-bold hover:bg-red-500 hover:text-white hover:border-transparent transition-all"
              >
                <Trash2 size={16} />
                清除所有数据 (重置)
              </button>
          </div>
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
