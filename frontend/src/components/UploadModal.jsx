import React, { useState, useRef } from 'react';
import { X, UploadCloud, CheckCircle, AlertCircle, Loader2, File } from 'lucide-react';
import { filesService } from '../services/api';
import { formatBytes } from '../services/utils';
import { useAuth } from '../context/AuthContext';

export default function UploadModal({ isOpen, onClose, currentFolderId, onUploadComplete }) {
  const { refreshUser } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(Array.from(e.target.files));
    }
  };

  const addFilesToQueue = (files) => {
    const newItems = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'pending', // pending, presigning, uploading, confirming, success, error
      errorMessage: null,
    }));
    setUploadQueue((prev) => [...prev, ...newItems]);
  };

  const startUploads = async () => {
    if (isUploading) return;
    setIsUploading(true);

    for (const item of uploadQueue) {
      if (item.status === 'success') continue;

      try {
        // Step 1: Request Presigned URL from API
        updateItem(item.id, { status: 'presigning', progress: 10 });
        const { uploadUrl, objectKey } = await filesService.getUploadUrl(
          item.file.name,
          item.file.size,
          item.file.type || 'application/octet-stream',
          currentFolderId
        );

        // Step 2: Upload directly to MinIO using Presigned PUT
        updateItem(item.id, { status: 'uploading' });
        await filesService.uploadDirectToMinIO(uploadUrl, item.file, (percent) => {
          updateItem(item.id, { progress: Math.max(10, Math.min(90, percent)) });
        });

        // Step 3: Confirm with API (saves metadata and pushes job to worker queue)
        updateItem(item.id, { status: 'confirming', progress: 95 });
        await filesService.confirmUpload({
          name: item.file.name,
          size: item.file.size,
          mime_type: item.file.type || 'application/octet-stream',
          folder_id: currentFolderId,
          object_key: objectKey,
        });

        updateItem(item.id, { status: 'success', progress: 100 });
      } catch (err) {
        console.error('Upload error for', item.name, err);
        const errorText = err.response?.data?.error || err.message || 'Lỗi tải lên';
        updateItem(item.id, { status: 'error', errorMessage: errorText });
      }
    }

    setIsUploading(false);
    await refreshUser();
    onUploadComplete();
  };

  const updateItem = (id, updates) => {
    setUploadQueue((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...updates } : it))
    );
  };

  const removeItem = (id) => {
    setUploadQueue((prev) => prev.filter((it) => it.id !== id));
  };

  const hasPending = uploadQueue.some((i) => i.status === 'pending');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-800">Tải tệp lên Drive</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dropzone */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto text-blue-600 mb-3 shadow-inner">
              <UploadCloud className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-gray-800">
              Kéo thả các file vào đây, hoặc <span className="text-blue-600 underline">chọn từ máy tính</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Hỗ trợ mọi định dạng file (ảnh, PDF, video, tài liệu nén...)
            </p>
          </div>

          {/* Files List in Queue */}
          {uploadQueue.length > 0 && (
            <div className="space-y-2 mt-4 max-h-56 overflow-y-auto pr-1">
              {uploadQueue.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 border border-gray-200/80 rounded-xl p-3 flex flex-col space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 truncate flex-1 pr-2">
                      <File className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="font-medium text-gray-800 truncate">{item.name}</span>
                      <span className="text-gray-400">({formatBytes(item.size)})</span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {item.status === 'pending' && (
                        <span className="text-gray-500">Chờ tải lên</span>
                      )}
                      {(item.status === 'presigning' || item.status === 'uploading' || item.status === 'confirming') && (
                        <div className="flex items-center space-x-1 text-blue-600">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{item.progress}%</span>
                        </div>
                      )}
                      {item.status === 'success' && (
                        <div className="flex items-center space-x-1 text-emerald-600">
                          <CheckCircle className="w-4 h-4" />
                          <span>Xong</span>
                        </div>
                      )}
                      {item.status === 'error' && (
                        <div className="flex items-center space-x-1 text-red-600" title={item.errorMessage}>
                          <AlertCircle className="w-4 h-4" />
                          <span>Lỗi</span>
                        </div>
                      )}

                      {!isUploading && item.status !== 'success' && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {(item.status === 'uploading' || item.status === 'confirming') && (
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-200"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {item.errorMessage && (
                    <p className="text-[11px] text-red-500 truncate">{item.errorMessage}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {uploadQueue.length} file đã chọn
          </span>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium rounded-xl hover:bg-gray-100 transition"
            >
              Đóng
            </button>
            <button
              onClick={startUploads}
              disabled={isUploading || !hasPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-md shadow-blue-200 transition-all flex items-center space-x-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tải lên...</span>
                </>
              ) : (
                <span>Bắt đầu tải lên</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

