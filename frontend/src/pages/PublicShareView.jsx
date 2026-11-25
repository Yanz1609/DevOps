import React, { useState, useEffect } from 'react';
import {
  Download,
  HardDrive,
  Lock,
  FileText,
  Loader2,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { sharesService } from '../services/api';
import { formatBytes, formatDate, getFileCategory } from '../services/utils';

export default function PublicShareView({ token }) {
  const [data, setData] = useState(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchShareInfo();
  }, [token]);

  const fetchShareInfo = async (pwd = '') => {
    try {
      setLoading(true);
      setError('');
      const res = await sharesService.getPublicShareInfo(token, pwd);
      setData(res);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Mật khẩu không chính xác');
      } else if (err.response?.status === 410) {
        setError('Liên kết chia sẻ này đã hết hạn');
      } else {
        setError(err.response?.data?.error || 'Không tìm thấy liên kết hoặc liên kết đã bị xóa');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!password) return;
    fetchShareInfo(password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-indigo-50/40 flex flex-col items-center justify-center p-4">
      {/* Brand Header */}
      <div className="flex items-center space-x-2.5 mb-8">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200">
          <HardDrive className="w-6 h-6" />
        </div>
        <span className="text-xl font-bold text-gray-800 tracking-tight">
          Drive <span className="text-blue-600">Mini</span>
        </span>
      </div>

      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl shadow-blue-100/50 border border-gray-100 p-8 sm:p-10 text-center">
        {loading ? (
          <div className="py-16 space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs text-gray-400">Đang tải thông tin tệp...</p>
          </div>
        ) : error && (!data || !data.requiresPassword) ? (
          <div className="py-12 space-y-3 text-red-500">
            <AlertCircle className="w-12 h-12 mx-auto text-red-400" />
            <h3 className="font-bold text-base text-gray-800">Không thể truy cập</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">{error}</p>
          </div>
        ) : data?.requiresPassword ? (
          /* Password Form */
          <div className="space-y-6">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Tệp này được bảo vệ bằng mật khẩu</h3>
              <p className="text-xs text-gray-500 mt-1">
                Tệp "{data.fileName}" được chia sẻ bởi {data.ownerName}. Vui lòng nhập mật khẩu để tải về.
              </p>
            </div>

            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

            <form onSubmit={handlePasswordSubmit} className="space-y-3 max-w-xs mx-auto">
              <input
                type="password"
                placeholder="Nhập mật khẩu..."
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 text-center transition"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-200 transition"
              >
                Mở khóa tệp
              </button>
            </form>
          </div>
        ) : data?.file ? (
          /* File Preview & Download */
          <div className="space-y-6">
            {/* Preview area */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex items-center justify-center min-h-[220px]">
              {data.viewUrl && data.file.mime_type.startsWith('image/') ? (
                <img
                  src={data.viewUrl}
                  alt={data.file.name}
                  className="max-h-56 object-contain rounded-xl shadow-md"
                />
              ) : (
                <div className="space-y-2">
                  <FileText className="w-16 h-16 text-blue-500 mx-auto" />
                  <p className="text-xs text-gray-400 uppercase font-mono tracking-wider">
                    {data.file.mime_type}
                  </p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-gray-800 truncate" title={data.file.name}>
                {data.file.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {formatBytes(data.file.size)} • Chia sẻ bởi {data.file.owner}
              </p>
            </div>

            <div className="pt-2 flex justify-center">
              <a
                href={data.downloadUrl}
                download={data.file.name}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-2xl shadow-lg shadow-blue-200 hover:shadow-xl transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Tải tệp xuống ngay</span>
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

