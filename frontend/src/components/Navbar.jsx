import React from 'react';
import { Search, HardDrive, LogOut, User, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatBytes } from '../services/utils';

export default function Navbar({ searchTerm, onSearchChange, selectedType, onTypeChange }) {
  const { user, usage, logout } = useAuth();

  const types = [
    { id: '', label: 'Tất cả' },
    { id: 'image', label: 'Hình ảnh' },
    { id: 'document', label: 'Tài liệu' },
    { id: 'video', label: 'Video' },
    { id: 'audio', label: 'Âm thanh' },
    { id: 'archive', label: 'Tệp nén' },
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-6 py-2.5 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center space-x-3 w-64">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
          <HardDrive className="w-6 h-6" />
        </div>
        <div>
          <span className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-1.5">
            Drive <span className="text-blue-600 text-sm font-semibold uppercase bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">Mini</span>
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex-1 max-w-2xl mx-8 flex items-center space-x-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm file hoặc thư mục trong Drive..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 hover:bg-gray-100/80 focus:bg-white border border-transparent focus:border-blue-500 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Filter chips */}
        <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-xl">
          {types.map((t) => (
            <button
              key={t.id}
              onClick={() => onTypeChange(t.id)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                selectedType === t.id
                  ? 'bg-white text-blue-600 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center space-x-4">
        {usage && (
          <div className="hidden lg:flex flex-col text-right text-xs">
            <span className="font-medium text-gray-700">
              {formatBytes(usage.used_bytes)} / {formatBytes(usage.quota_bytes)}
            </span>
            <div className="w-28 bg-gray-200 h-1.5 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  usage.used_percent > 90 ? 'bg-red-500' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(100, usage.used_percent)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center space-x-3 pl-2 border-l border-gray-200">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
            {user?.full_name ? user.full_name[0].toUpperCase() : user?.email ? user.email[0].toUpperCase() : 'U'}
          </div>
          <div className="hidden sm:block text-left text-xs">
            <p className="font-semibold text-gray-800 truncate max-w-[120px]">
              {user?.full_name || user?.email?.split('@')[0]}
            </p>
            <p className="text-gray-500 truncate max-w-[120px]">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Đăng xuất"
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

