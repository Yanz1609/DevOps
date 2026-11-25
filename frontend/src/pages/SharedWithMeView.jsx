import React, { useState, useEffect } from 'react';
import { Users, Download, Eye, FileText, Loader2, RefreshCw } from 'lucide-react';
import { sharesService, filesService } from '../services/api';
import { formatBytes, formatDate, getFileCategory } from '../services/utils';

export default function SharedWithMeView({ onPreviewFile }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShared();
  }, []);

  const loadShared = async () => {
    try {
      setLoading(true);
      const data = await sharesService.getSharedWithMe();
      setFiles(data.files || []);
    } catch (err) {
      console.error('Error loading shared files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileId) => {
    try {
      const data = await filesService.getDownloadUrl(fileId);
      window.open(data.downloadUrl, '_blank');
    } catch {
      alert('Không thể tải file');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-gray-800">Được chia sẻ với tôi</h2>
        </div>
        <button
          onClick={loadShared}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-xl transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs text-gray-400">Đang tải danh sách được chia sẻ...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-24 space-y-3">
          <Users className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-sm font-semibold text-gray-700">Chưa có tệp nào được chia sẻ với bạn</p>
          <p className="text-xs text-gray-400">
            Khi người dùng khác chia sẻ tệp với email của bạn, tệp sẽ xuất hiện ở đây.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Tên tệp</th>
                <th className="py-3 px-4">Người chia sẻ</th>
                <th className="py-3 px-4">Kích thước</th>
                <th className="py-3 px-4">Quyền</th>
                <th className="py-3 px-4">Ngày chia sẻ</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-blue-50/40 transition">
                  <td className="py-3 px-4 font-semibold text-gray-800 flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="truncate max-w-xs">{file.name}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">
                    {file.owner_name ? `${file.owner_name} (${file.owner_email})` : file.owner_email}
                  </td>
                  <td className="py-3 px-4 text-gray-500">{formatBytes(file.size)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                      {file.share_permission}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-400">{formatDate(file.shared_at)}</td>
                  <td className="py-3 px-4 text-right space-x-1">
                    <button
                      onClick={() => onPreviewFile(file)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
                      title="Xem trước"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(file.id)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
                      title="Tải xuống"
                    >
                      <Download className="w-4 h-4" />
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

