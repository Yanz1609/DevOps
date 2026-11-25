
import React, { useState, useEffect } from 'react';

import {
  ChevronRight,
  FolderPlus,
  Upload,
  Folder as FolderIcon,
  File as FileIcon,
  RefreshCw,
  Loader2,
  HardDrive,
} from 'lucide-react';

import FolderCard from '../components/FolderCard';
import FileCard from '../components/FileCard';

import { filesService, foldersService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function DriveView({
  currentFolderId,
  onFolderChange,
  searchTerm,
  selectedType,
  onOpenUpload,
  onOpenNewFolder,
  onPreviewFile,
  onShareFile,
  onRenameItem,
}) {
  const { refreshUser } = useAuth();

  const [breadcrumbs, setBreadcrumbs] = useState([
    { id: null, name: 'Drive của tôi' },
  ]);

  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tải dữ liệu khi đổi thư mục, tìm kiếm, lọc
  useEffect(() => {
    loadContent();
  }, [currentFolderId, searchTerm, selectedType]);

  const loadContent = async () => {
    try {
      setLoading(true);

      const data = await filesService.list(
        currentFolderId,
        searchTerm,
        selectedType
      );

      setFolders(data.folders || []);
      setFiles(data.files || []);

      if (data.breadcrumbs && !searchTerm) {
        setBreadcrumbs(data.breadcrumbs);
      }
    } catch (err) {
      console.error('Error loading drive items:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mở thư mục - cập nhật App.jsx
  const handleOpenFolder = (folder) => {
    onFolderChange(folder.id);
  };

  // Quay lại thư mục qua breadcrumb
  const handleBreadcrumbClick = (id) => {
    onFolderChange(id);
  };

  // Xóa thư mục
  const handleDeleteFolder = async (folder) => {
    if (
      !window.confirm(
        `Chuyển thư mục "${folder.name}" và toàn bộ tệp bên trong vào thùng rác?`
      )
    ) {
      return;
    }

    try {
      await foldersService.delete(folder.id);
      await loadContent();
      await refreshUser();
    } catch (err) {
      console.error(err);
      alert('Không thể xóa thư mục');
    }
  };

  // Xóa file
  const handleDeleteFile = async (file) => {
    if (
      !window.confirm(
        `Chuyển tệp "${file.name}" vào thùng rác?`
      )
    ) {
      return;
    }

    try {
      await filesService.delete(file.id);
      await loadContent();
      await refreshUser();
    } catch (err) {
      console.error(err);
      alert('Không thể xóa tệp');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">

      {/* Breadcrumb và làm mới */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200/80">

        <div className="flex items-center space-x-1.5 text-sm">
          {searchTerm ? (
            <span className="font-semibold text-gray-700">
              Kết quả tìm kiếm cho: "{searchTerm}"
            </span>
          ) : (
            breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;

              return (
                <React.Fragment key={crumb.id || 'root'}>
                  {idx > 0 && (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}

                  <button
                    onClick={() => handleBreadcrumbClick(crumb.id)}
                    className={`font-semibold transition hover:text-blue-600 ${
                      isLast
                        ? 'text-gray-900 pointer-events-none'
                        : 'text-gray-500 hover:underline'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>

        <button
          onClick={loadContent}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-xl transition"
          title="Tải lại"
        >
          <RefreshCw
            className={`w-4 h-4 ${
              loading ? 'animate-spin text-blue-600' : ''
            }`}
          />
        </button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs text-gray-400">
            Đang tải tệp tin và thư mục...
          </p>
        </div>
      ) : folders.length === 0 && files.length === 0 ? (

        /* Thư mục trống */
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">

          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center shadow-inner">
            <HardDrive className="w-10 h-10" />
          </div>

          <div>
            <h4 className="text-base font-bold text-gray-800">
              Thư mục này còn trống
            </h4>

            <p className="text-xs text-gray-500 max-w-sm mt-1">
              Bắt đầu tải tệp lên hoặc tạo thư mục mới
              để tổ chức dữ liệu của bạn.
            </p>
          </div>

          <div className="flex items-center space-x-3 pt-2">

            <button
              onClick={onOpenNewFolder}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition"
            >
              <FolderPlus className="w-4 h-4 text-amber-500" />
              <span>Thư mục mới</span>
            </button>

            <button
              onClick={onOpenUpload}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-200 transition"
            >
              <Upload className="w-4 h-4" />
              <span>Tải tệp lên</span>
            </button>

          </div>
        </div>
      ) : (
        <>
          {/* Danh sách thư mục */}
          {folders.length > 0 && (
            <div className="space-y-3">

              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <FolderIcon className="w-3.5 h-3.5" />
                <span>Thư mục ({folders.length})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

                {folders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    onOpen={handleOpenFolder}
                    onRename={(f) => onRenameItem(f, true)}
                    onDelete={handleDeleteFolder}
                  />
                ))}

              </div>
            </div>
          )}

          {/* Danh sách file */}
          {files.length > 0 && (
            <div className="space-y-3 pt-2">

              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileIcon className="w-3.5 h-3.5" />
                <span>Tệp tin ({files.length})</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">

                {files.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onPreview={onPreviewFile}
                    onShare={onShareFile}
                    onRename={(f) => onRenameItem(f, false)}
                    onDelete={handleDeleteFile}
                  />
                ))}

              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
