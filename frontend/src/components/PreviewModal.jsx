import React, { useState, useEffect } from 'react';
import { X, Download, Loader2, FileText, ExternalLink } from 'lucide-react';
import { filesService } from '../services/api';
import { formatBytes, getFileCategory } from '../services/utils';

export default function PreviewModal({ isOpen, onClose, file }) {
  const [viewUrl, setViewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (isOpen && file) {
      loadViewUrl();
    } else {
      setViewUrl(null);
    }
  }, [isOpen, file]);

  const loadViewUrl = async () => {
    try {
      setLoading(true);
      const data = await filesService.getViewUrl(file.id);
      setViewUrl(data.viewUrl);
    } catch (err) {
      console.error('Error fetching preview URL:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const data = await filesService.getDownloadUrl(file.id);
      window.open(data.downloadUrl, '_blank');
    } catch (err) {
      alert('Không thể tải xuống');
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen || !file) return null;

  const category = getFileCategory(file.mime_type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm z-10">
          <div className="flex items-center space-x-3 truncate">
            <span className="font-semibold text-sm truncate max-w-md">{file.name}</span>
            <span className="text-xs text-gray-400">({formatBytes(file.size)})</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-xs font-semibold rounded-xl transition shadow-sm"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Tải xuống</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-auto bg-black/40 min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center space-y-2 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-xs">Đang tải bản xem trước...</p>
            </div>
          ) : viewUrl ? (
            category === 'image' ? (
              <img
                src={viewUrl}
                alt={file.name}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg"
              />
            ) : file.mime_type.includes('pdf') ? (
              <iframe
                src={viewUrl}
                title={file.name}
                className="w-full h-[70vh] rounded-xl border border-gray-800 bg-white"
              />
            ) : category === 'video' ? (
              <video controls className="max-w-full max-h-[70vh] rounded-xl shadow-lg">
                <source src={viewUrl} type={file.mime_type} />
                Trình duyệt của bạn không hỗ trợ phát video này.
              </video>
            ) : category === 'audio' ? (
              <audio controls className="w-full max-w-md">
                <source src={viewUrl} type={file.mime_type} />
                Trình duyệt của bạn không hỗ trợ phát âm thanh này.
              </audio>
            ) : (
              <div className="text-center p-8 space-y-4">
                <FileText className="w-16 h-16 text-gray-500 mx-auto" />
                <p className="text-sm text-gray-300">
                  Định dạng này không hỗ trợ xem trước trực tiếp trên trình duyệt.
                </p>
                <button
                  onClick={handleDownload}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-sm font-semibold rounded-xl inline-flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải về máy để xem</span>
                </button>
              </div>
            )
          ) : (
            <p className="text-sm text-red-400">Không thể tải dữ liệu file để xem trước</p>
          )}
        </div>
      </div>
    </div>
  );
}

