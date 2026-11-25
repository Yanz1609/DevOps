import React, { useState, useEffect } from 'react';
import { X, Edit2, Loader2 } from 'lucide-react';
import { filesService, foldersService } from '../services/api';

export default function RenameModal({ isOpen, onClose, item, isFolder, onRenamed }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setError('');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      if (isFolder) {
        await foldersService.update(item.id, { name: name.trim() });
      } else {
        await filesService.update(item.id, { name: name.trim() });
      }
      onRenamed();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Không thể đổi tên');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <Edit2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-800">
              Đổi tên {isFolder ? 'thư mục' : 'tệp tin'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium rounded-xl hover:bg-gray-100 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md shadow-blue-200 transition flex items-center space-x-1.5"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

