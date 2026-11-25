import React, { useState } from 'react';
import { Folder, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { formatDate } from '../services/utils';

export default function FolderCard({ folder, onOpen, onRename, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      onDoubleClick={() => onOpen(folder)}
      className="group relative bg-white border border-gray-200/90 hover:border-blue-400 hover:shadow-md rounded-2xl p-3.5 flex items-center justify-between transition-all cursor-pointer select-none"
    >
      <div className="flex items-center space-x-3 truncate flex-1 pr-2">
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
          <Folder className="w-5 h-5 fill-amber-500/20" />
        </div>
        <div className="truncate">
          <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-600 transition">
            {folder.name}
          </p>
          <p className="text-[11px] text-gray-400">
            {formatDate(folder.created_at)}
          </p>
        </div>
      </div>

      <div className="relative shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition opacity-0 group-hover:opacity-100"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showMenu && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-7 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-20"
          >
            <button
              onClick={() => {
                setShowMenu(false);
                onRename(folder);
              }}
              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Đổi tên</span>
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => {
                setShowMenu(false);
                onDelete(folder);
              }}
              className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa thư mục</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

