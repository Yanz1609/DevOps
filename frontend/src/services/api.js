import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('drive_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/s/')) {
      localStorage.removeItem('drive_token');
      localStorage.removeItem('drive_user');
      window.dispatchEvent(new Event('auth_logout'));
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (email, password, full_name) => {
    const res = await api.post('/auth/register', { email, password, full_name });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const filesService = {
  list: async (folderId = null, search = '', type = '') => {
    const params = {};
    if (folderId) params.folder_id = folderId;
    if (search) params.search = search;
    if (type) params.type = type;
    const res = await api.get('/files', { params });
    return res.data;
  },
  getUploadUrl: async (name, size, mime_type, folder_id = null) => {
    const res = await api.post('/files/upload-url', { name, size, mime_type, folder_id });
    return res.data;
  },
  // Direct client-to-MinIO upload via presigned URL with progress reporting
  uploadDirectToMinIO: async (uploadUrl, file, onProgress) => {
    return await axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });
  },
  confirmUpload: async (payload) => {
    const res = await api.post('/files/confirm', payload);
    return res.data;
  },
  getDownloadUrl: async (id) => {
    const res = await api.get(`/files/${id}/download`);
    return res.data;
  },
  getViewUrl: async (id) => {
    const res = await api.get(`/files/${id}/view`);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.patch(`/files/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/files/${id}`);
    return res.data;
  },
  restore: async (id) => {
    const res = await api.post(`/files/${id}/restore`);
    return res.data;
  },
  permanentDelete: async (id) => {
    const res = await api.delete(`/files/${id}/permanent`);
    return res.data;
  },
};

export const foldersService = {
  create: async (name, parent_id = null) => {
    const res = await api.post('/folders', { name, parent_id });
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.patch(`/folders/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/folders/${id}`);
    return res.data;
  },
  restore: async (id) => {
    const res = await api.post(`/folders/${id}/restore`);
    return res.data;
  },
  permanentDelete: async (id) => {
    const res = await api.delete(`/folders/${id}/permanent`);
    return res.data;
  },
};

export const trashService = {
  get: async () => {
    const res = await api.get('/trash');
    return res.data;
  },
  empty: async () => {
    const res = await api.post('/trash/empty');
    return res.data;
  },
};

export const sharesService = {
  createPublic: async (fileId, options) => {
    const res = await api.post(`/files/${fileId}/share`, options);
    return res.data;
  },
  getFileShares: async (fileId) => {
    const res = await api.get(`/files/${fileId}/shares`);
    return res.data;
  },
  revokePublic: async (shareId) => {
    const res = await api.delete(`/shares/${shareId}`);
    return res.data;
  },
  shareWithUser: async (fileId, email, permission) => {
    const res = await api.post(`/files/${fileId}/user-share`, { email, permission });
    return res.data;
  },
  revokeUserShare: async (userShareId) => {
    const res = await api.delete(`/shares/user-share/${userShareId}`);
    return res.data;
  },
  getSharedWithMe: async () => {
    const res = await api.get('/shares/shared-with-me');
    return res.data;
  },
  getPublicShareInfo: async (token, password = '') => {
    const params = password ? { password } : {};
    const res = await axios.get(`/api/s/${token}`, { params });
    return res.data;
},
};

export const usageService = {
  getUsage: async () => {
    const res = await api.get('/me/usage');
    return res.data;
  },
};

export default api;

