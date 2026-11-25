
import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';

import AuthPage from './pages/AuthPage';
import DriveView from './pages/DriveView';
import SharedWithMeView from './pages/SharedWithMeView';
import TrashView from './pages/TrashView';
import PublicShareView from './pages/PublicShareView';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import UploadModal from './components/UploadModal';
import NewFolderModal from './components/NewFolderModal';
import ShareModal from './components/ShareModal';
import PreviewModal from './components/PreviewModal';
import RenameModal from './components/RenameModal';

export default function App() {
  const { user, loading } = useAuth();

  // Public share link: /s/:token
  const [publicToken, setPublicToken] = useState(null);

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/s\/([a-zA-Z0-9_-]+)/);

    if (match) {
      setPublicToken(match[1]);
    }
  }, []);

  // Giao diện
  const [currentView, setCurrentView] = useState('my-drive');

  // Thư mục hiện tại - dùng chung cho DriveView và Modal
  const [currentFolderId, setCurrentFolderId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [shareFile, setShareFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [renameItem, setRenameItem] = useState(null);

  // Tải lại dữ liệu
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshDrive = () => {
    setRefreshKey((k) => k + 1);
  };

  // Chuyển màn hình
  const handleViewChange = (view) => {
    setCurrentView(view);

    if (view !== 'my-drive') {
      setCurrentFolderId(null);
    }
  };

  if (publicToken) {
    return <PublicShareView token={publicToken} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">

      {/* Navbar */}
      <Navbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
      />

      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onViewChange={handleViewChange}
          onOpenUpload={() => setShowUploadModal(true)}
          onOpenNewFolder={() => setShowNewFolderModal(true)}
        />

        {/* Nội dung */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white/70">

          {currentView === 'my-drive' && (
            <DriveView
              key={refreshKey}
              currentFolderId={currentFolderId}
              onFolderChange={setCurrentFolderId}
              searchTerm={searchTerm}
              selectedType={selectedType}
              onOpenUpload={() => setShowUploadModal(true)}
              onOpenNewFolder={() => setShowNewFolderModal(true)}
              onPreviewFile={(f) => setPreviewFile(f)}
              onShareFile={(f) => setShareFile(f)}
              onRenameItem={(item, isFolder) =>
                setRenameItem({ item, isFolder })
              }
            />
          )}

          {currentView === 'shared-with-me' && (
            <SharedWithMeView
              key={refreshKey}
              onPreviewFile={(f) => setPreviewFile(f)}
            />
          )}

          {currentView === 'trash' && (
            <TrashView key={refreshKey} />
          )}

        </main>
      </div>

      {/* Upload file vào thư mục đang mở */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        currentFolderId={currentFolderId}
        onUploadComplete={refreshDrive}
      />

      {/* Tạo thư mục con trong thư mục đang mở */}
      <NewFolderModal
        isOpen={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        currentFolderId={currentFolderId}
        onFolderCreated={refreshDrive}
      />

      {/* Chia sẻ */}
      <ShareModal
        isOpen={!!shareFile}
        onClose={() => setShareFile(null)}
        file={shareFile}
      />

      {/* Xem trước */}
      <PreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />

      {/* Đổi tên */}
      <RenameModal
        isOpen={!!renameItem}
        onClose={() => setRenameItem(null)}
        item={renameItem?.item}
        isFolder={renameItem?.isFolder}
        onRenamed={refreshDrive}
      />

    </div>
  );
}
