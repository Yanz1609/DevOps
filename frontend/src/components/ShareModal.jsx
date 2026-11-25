import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Lock,
  Clock,
  Trash2,
  UserPlus,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react';
import { sharesService } from '../services/api';

export default function ShareModal({ isOpen, onClose, file }) {
  const [activeTab, setActiveTab] = useState('public'); // 'public' | 'user'
  const [sharesData, setSharesData] = useState({ publicShares: [], userShares: [] });
  const [loading, setLoading] = useState(false);

  // Form states for Public link
  const [password, setPassword] = useState('');
  const [expiresInHours, setExpiresInHours] = useState('24');
  const [permission, setPermission] = useState('view');
  const [copiedToken, setCopiedToken] = useState(null);

  // Form states for User share
  const [targetEmail, setTargetEmail] = useState('');
  const [userPermission, setUserPermission] = useState('view');
  const [userShareMsg, setUserShareMsg] = useState('');
  const [userShareErr, setUserShareErr] = useState('');

  useEffect(() => {
    if (isOpen && file) {
      loadShares();
    }
  }, [isOpen, file]);

  const loadShares = async () => {
    try {
      setLoading(true);
      const data = await sharesService.getFileShares(file.id);
      setSharesData(data);
    } catch (err) {
      console.error('Error loading shares:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePublic = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await sharesService.createPublic(file.id, {
        permission,
        password: password.trim() || undefined,
        expires_in_hours: expiresInHours ? parseInt(expiresInHours, 10) : undefined,
      });
      setPassword('');
      await loadShares();
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi khi tạo liên kết chia sẻ');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokePublic = async (shareId) => {
    if (!window.confirm('Bạn có chắc chắn muốn thu hồi liên kết này không?')) return;
    try {
      await sharesService.revokePublic(shareId);
      await loadShares();
    } catch (err) {
      alert('Không thể thu hồi liên kết');
    }
  };

  const handleShareWithUser = async (e) => {
    e.preventDefault();
    if (!targetEmail.trim()) return;
    setUserShareMsg('');
    setUserShareErr('');

    try {
      setLoading(true);
      await sharesService.shareWithUser(file.id, targetEmail.trim(), userPermission);
      setUserShareMsg(`Đã chia sẻ thành công với ${targetEmail}`);
      setTargetEmail('');
      await loadShares();
    } catch (err) {
      setUserShareErr(err.response?.data?.error || 'Không thể chia sẻ với người dùng này');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeUserShare = async (userShareId) => {
    if (!window.confirm('Thu hồi quyền truy cập của người dùng này?')) return;
    try {
      await sharesService.revokeUserShare(userShareId);
      await loadShares();
    } catch (err) {
      alert('Không thể thu hồi quyền chia sẻ');
    }
  };

  const copyToClipboard = (token) => {
    const fullUrl = `${window.location.origin}/s/${token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <Share2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-800 truncate max-w-xs">
              Chia sẻ "{file.name}"
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 pt-2">
          <button
            onClick={() => setActiveTab('public')}
            className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 flex items-center space-x-2 ${
              activeTab === 'public'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>Link công khai</span>
          </button>
          <button
            onClick={() => setActiveTab('user')}
            className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 flex items-center space-x-2 ${
              activeTab === 'user'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Chia sẻ theo người dùng</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'public' ? (
            <>
              {/* Form create public share */}
              <form onSubmit={handleCreatePublic} className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 space-y-3">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Tạo link chia sẻ mới
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-gray-500 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Thời hạn
                    </label>
                    <select
                      value={expiresInHours}
                      onChange={(e) => setExpiresInHours(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="1">1 giờ</option>
                      <option value="24">24 giờ (1 ngày)</option>
                      <option value="168">7 ngày</option>
                      <option value="720">30 ngày</option>
                      <option value="">Vĩnh viễn (Không hết hạn)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-gray-500 mb-1 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> Mật khẩu (tùy chọn)
                    </label>
                    <input
                      type="password"
                      placeholder="Không bắt buộc"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
                >
                  Tạo liên kết
                </button>
              </form>

              {/* Existing public shares */}
              <div>
                <span className="text-xs font-semibold text-gray-600 block mb-2">
                  Các link đang hoạt động ({sharesData.publicShares.length})
                </span>

                {sharesData.publicShares.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Chưa có liên kết chia sẻ nào.</p>
                ) : (
                  <div className="space-y-2">
                    {sharesData.publicShares.map((s) => (
                      <div
                        key={s.id}
                        className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between shadow-sm"
                      >
                        <div className="flex-1 pr-2">
                          <p className="text-xs font-mono font-medium text-blue-600 truncate">
                            {window.location.origin}/s/{s.token}
                          </p>
                          <div className="flex items-center space-x-2 mt-1 text-[11px] text-gray-400">
                            {s.has_password && (
                              <span className="flex items-center gap-0.5 text-amber-600">
                                <Lock className="w-3 h-3" /> Có mật khẩu
                              </span>
                            )}
                            {s.expires_at ? (
                              <span>Hết hạn: {new Date(s.expires_at).toLocaleDateString()}</span>
                            ) : (
                              <span>Không hết hạn</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => copyToClipboard(s.token)}
                            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Sao chép link"
                          >
                            {copiedToken === s.token ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRevokePublic(s.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Thu hồi liên kết"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Form share with user */}
              <form onSubmit={handleShareWithUser} className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 space-y-3">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Chia sẻ cho người dùng khác
                </span>

                <div className="flex items-center space-x-2">
                  <input
                    type="email"
                    placeholder="Nhập email người nhận..."
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    className="flex-1 text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <select
                    value={userPermission}
                    onChange={(e) => setUserPermission(e.target.value)}
                    className="text-xs px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="view">Xem</option>
                    <option value="edit">Chỉnh sửa</option>
                  </select>
                </div>

                {userShareMsg && <p className="text-xs text-emerald-600">{userShareMsg}</p>}
                {userShareErr && <p className="text-xs text-red-500">{userShareErr}</p>}

                <button
                  type="submit"
                  disabled={loading || !targetEmail.trim()}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
                >
                  Chia sẻ
                </button>
              </form>

              {/* Shared users list */}
              <div>
                <span className="text-xs font-semibold text-gray-600 block mb-2">
                  Người dùng có quyền truy cập ({sharesData.userShares.length})
                </span>

                {sharesData.userShares.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Chưa chia sẻ với người dùng nào.</p>
                ) : (
                  <div className="space-y-2">
                    {sharesData.userShares.map((us) => (
                      <div
                        key={us.id}
                        className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between shadow-sm"
                      >
                        <div>
                          <p className="text-xs font-semibold text-gray-800">
                            {us.shared_with_email}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            Quyền: {us.permission === 'edit' ? 'Chỉnh sửa' : 'Chỉ xem'}
                          </p>
                        </div>

                        <button
                          onClick={() => handleRevokeUserShare(us.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Thu hồi quyền"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200/60 rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

