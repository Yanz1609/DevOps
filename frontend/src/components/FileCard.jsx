import React, { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  File,
  Download,
  Share2,
  Trash2,
  MoreVertical,
  Eye,
  Loader2,
  Edit2,
} from 'lucide-react';
import { formatBytes, formatDate, getFileCategory } from '../services/utils';
import { filesService } from '../services/api';

export default function FileCard({
  file,
  onPreview,
  onShare,
  onRename,
  onDelete,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const category = getFileCategory(file.mime_type);

  const handleDownload = async (e) => {
    e?.stopPropagation();
    try {
      setIsDownloading(true);
      const data = await filesService.getDownloadUrl(file.id);
      window.open(data.downloadUrl, '_blank');
    } catch (err) {
      alert('Không thể tải xuống file');
    } finally {
      setIsDownloading(false);
    }
  };

  const renderIcon = () => {
    switch (category) {
      case 'image':
        return <ImageIcon className="w-8 h-8 text-blue-500" />;
      case 'document':
        return <FileText className="w-8 h-8 text-emerald-500" />;
      case 'video':
        return <Film className="w-8 h-8 text-purple-500" />;
      case 'audio':
        return <Music className="w-8 h-8 text-pink-500" />;
      case 'archive':
        return <Archive className="w-8 h-8 text-amber-500" />;
      default:
        return <File className="w-8 h-8 text-gray-400" />;
    }
  };

  return (
    <div
      onClick={() => onPreview(file)}
      className="group relative bg-white border border-gray-200/90 hover:border-blue-400 hover:shadow-lg rounded-2xl overflow-hidden transition-all cursor-pointer flex flex-col justify-between"
    >
      {/* Thumbnail or Icon Preview Container */}
      <div className="h-36 bg-gray-50 flex items-center justify-center overflow-hidden relative border-b border-gray-100">
        {file.thumbnail_url ? (
          <img
            src={file.thumbnail_url}
            alt={file.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            loading="lazy"
          />
        ) : file.thumb_status === 'pending' || file.thumb_status === 'processing' ? (
          <div className="flex flex-col items-center space-y-1.5 text-blue-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-[10px] text-gray-500 font-medium">Đang tạo thumbnail...</span>
          </div>
        ) : (
          <div className="group-hover:scale-110 transition duration-300">
            {renderIcon()}
          </div>
        )}

        {/* Hover quick preview button */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview(file);
            }}
            className="p-2 bg-white/90 hover:bg-white text-gray-800 rounded-xl shadow-md transition"
            title="Xem trước"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="p-2 bg-white/90 hover:bg-white text-gray-800 rounded-xl shadow-md transition"
            title="Tải xuống"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(file);
            }}
            className="p-2 bg-white/90 hover:bg-white text-blue-600 rounded-xl shadow-md transition"
            title="Chia sẻ"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Meta Footer */}
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="truncate flex-1 pr-2">
            <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-blue-600 transition" title={file.name}>
              {file.name}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {formatBytes(file.size)} • {formatDate(file.created_at)}
            </p>
          </div>

          <div className="relative shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 bottom-6 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-20 animate-in fade-in zoom-in-95"
              >
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onPreview(file);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem trước</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleDownload();
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải xuống</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onShare(file);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Chia sẻ</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onRename(file);
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
                    onDelete(file);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa vào thùng rác</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

