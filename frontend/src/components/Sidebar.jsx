import React, { useState, useRef, useEffect } from 'react';
import {
  FolderPlus,
  Upload,
  HardDrive,
  Users,
  Trash2,
  Plus,
  Cloud,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatBytes } from '../services/utils';

export default function Sidebar({
  currentView,
  onViewChange,
  onOpenUpload,
  onOpenNewFolder,
}) {
  const { usage } = useAuth();
  const [showNewMenu, setShowNewMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowNewMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'my-drive', label: 'Drive của tôi', icon: HardDrive },
    { id: 'shared-with-me', label: 'Được chia sẻ với tôi', icon: Users },
    { id: 'trash', label: 'Thùng rác', icon: Trash2 },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between p-4 h-[calc(100vh-61px)] select-none">
      <div>
        {/* Action Button: "Mới" */}
        <div className="relative mb-6" ref={menuRef}>
          <button
            onClick={() => setShowNewMenu(!showNewMenu)}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md text-gray-800 font-semibold rounded-2xl shadow-sm transition-all"
          >
            <Plus className="w-5 h-5 text-blue-600 stroke-[2.5]" />
            <span>Tạo mới</span>
          </button>

          {showNewMenu && (
            <div className="absolute top-14 left-0 w-full bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-40 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => {
                  setShowNewMenu(false);
                  onOpenNewFolder();
                }}
                className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                <FolderPlus className="w-4 h-4 text-amber-500" />
                <span>Thư mục mới</span>
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => {
                  setShowNewMenu(false);
                  onOpenUpload();
                }}
                className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Tải tệp lên</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100/70 hover:text-gray-900'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Storage Quota widget */}
      {usage && (
        <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4">
          <div className="flex items-center space-x-2 text-gray-700 mb-2">
            <Cloud className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold uppercase tracking-wider">Bộ nhớ lưu trữ</span>
          </div>

          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden my-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usage.used_percent > 90 ? 'bg-red-500' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(100, usage.used_percent)}%` }}
            />
          </div>

          <p className="text-xs text-gray-600">
            Đã dùng <span className="font-semibold text-gray-900">{formatBytes(usage.used_bytes)}</span> trên{' '}
            {formatBytes(usage.quota_bytes)} ({usage.used_percent}%)
          </p>

          <p className="text-[11px] text-gray-400 mt-1">
            Tổng cộng: {usage.total_files} file(s)
          </p>
        </div>
      )}
    </aside>
  );
}

