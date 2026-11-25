import React, { useState, useEffect } from 'react';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Folder,
  File,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { trashService, filesService, foldersService } from '../services/api';
import { formatBytes, formatDate } from '../services/utils';
import { useAuth } from '../context/AuthContext';

export default function TrashView() {
  const { refreshUser } = useAuth();
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrash();
  }, []);

  const loadTrash = async () => {
    try {
      setLoading(true);
      const data = await trashService.get();
      setFolders(data.folders || []);
      setFiles(data.files || []);
    } catch (err) {
      console.error('Error loading trash:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm('CẢNH BÁO: Tất cả tệp và thư mục trong thùng rác sẽ bị XÓA VĨNH VIỄN khỏi hệ thống. Bạn có chắc chắn không?')) {
      return;
    }
    try {
      setLoading(true);
      await trashService.empty();
      await loadTrash();
      await refreshUser();
    } catch (err) {
      alert('Không thể dọn thùng rác');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreFile = async (id) => {
    try {
      await filesService.restore(id);
      await loadTrash();
      await refreshUser();
    } catch {
      alert('Không thể khôi phục tệp');
    }
  };

  const handlePermanentDeleteFile = async (id) => {
    if (!window.confirm('Tệp này sẽ bị xóa vĩnh viễn và không thể phục hồi. Tiếp tục?')) return;
    try {
      await filesService.permanentDelete(id);
      await loadTrash();
      await refreshUser();
    } catch {
      alert('Không thể xóa vĩnh viễn tệp');
    }
  };

  const handleRestoreFolder = async (id) => {
    try {
      await foldersService.restore(id);
      await loadTrash();
      await refreshUser();
    } catch {
      alert('Không thể khôi phục thư mục');
    }
  };

  const handlePermanentDeleteFolder = async (id) => {
    if (!window.confirm('Thư mục và mọi tệp bên trong sẽ bị xóa vĩnh viễn khỏi MinIO. Tiếp tục?')) return;
    try {
      await foldersService.permanentDelete(id);
      await loadTrash();
      await refreshUser();
    } catch {
      alert('Không thể xóa vĩnh viễn thư mục');
    }
  };

  const totalItems = folders.length + files.length;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Trash2 className="w-5 h-5 text-red-500" />
          <h2 className="text-base font-bold text-gray-800">Thùng rác</h2>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadTrash}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-xl transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {totalItems > 0 && (
            <button
              onClick={handleEmptyTrash}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs rounded-xl border border-red-200 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Dọn sạch thùng rác</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs text-gray-400">Đang tải thùng rác...</p>
        </div>
      ) : totalItems === 0 ? (
        <div className="text-center py-24 space-y-3">
          <Trash2 className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-sm font-semibold text-gray-700">Thùng rác trống</p>
          <p className="text-xs text-gray-400">
            Các mục bị xóa sẽ được giữ tạm thời tại đây trước khi xóa vĩnh viễn.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Tên</th>
                <th className="py-3 px-4">Loại</th>
                <th className="py-3 px-4">Kích thước</th>
                <th className="py-3 px-4">Ngày xóa</th>
                <th className="py-3 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Deleted Folders */}
              {folders.map((folder) => (
                <tr key={folder.id} className="hover:bg-red-50/30 transition">
                  <td className="py-3 px-4 font-semibold text-gray-800 flex items-center space-x-2">
                    <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="truncate max-w-xs">{folder.name}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">Thư mục</td>
                  <td className="py-3 px-4 text-gray-400">—</td>
                  <td className="py-3 px-4 text-gray-400">{formatDate(folder.deleted_at)}</td>
                  <td className="py-3 px-4 text-right space-x-1">
                    <button
                      onClick={() => handleRestoreFolder(folder.id)}
                      className="px-2.5 py-1 text-blue-600 hover:bg-blue-50 font-semibold rounded-lg transition inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Khôi phục</span>
                    </button>
                    <button
                      onClick={() => handlePermanentDeleteFolder(folder.id)}
                      className="px-2.5 py-1 text-red-600 hover:bg-red-50 font-semibold rounded-lg transition inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa vĩnh viễn</span>
                    </button>
                  </td>
                </tr>
              ))}

              {/* Deleted Files */}
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-red-50/30 transition">
                  <td className="py-3 px-4 font-semibold text-gray-800 flex items-center space-x-2">
                    <File className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate max-w-xs">{file.name}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">Tệp tin</td>
                  <td className="py-3 px-4 text-gray-500">{formatBytes(file.size)}</td>
                  <td className="py-3 px-4 text-gray-400">{formatDate(file.deleted_at)}</td>
                  <td className="py-3 px-4 text-right space-x-1">
                    <button
                      onClick={() => handleRestoreFile(file.id)}
                      className="px-2.5 py-1 text-blue-600 hover:bg-blue-50 font-semibold rounded-lg transition inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Khôi phục</span>
                    </button>
                    <button
                      onClick={() => handlePermanentDeleteFile(file.id)}
                      className="px-2.5 py-1 text-red-600 hover:bg-red-50 font-semibold rounded-lg transition inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa vĩnh viễn</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

