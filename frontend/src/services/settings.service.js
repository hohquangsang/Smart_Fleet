import api from './api';

const BASE = '/admin/settings';

export const settingsApi = {
  // Profile
  getProfile:      () => api.get(`${BASE}/profile`),
  updateProfile:   (data) => api.patch(`${BASE}/profile`, data),
  changePassword:  (data) => api.patch(`${BASE}/profile/password`, data),
  uploadAvatar:    (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      api.post(`${BASE}/profile/avatar`, { avatarBase64: reader.result })
        .then(resolve)
        .catch(reject);
    };
    reader.onerror = () => reject(new Error('Không thể đọc file ảnh'));
    reader.readAsDataURL(file);
  }),

  // System Config
  getConfig:       () => api.get(`${BASE}/config`),
  updateConfig:    (updates) => api.patch(`${BASE}/config`, { updates }),

  // Admin Accounts
  getAdmins:       () => api.get(`${BASE}/admins`),
  createAdmin:     (data) => api.post(`${BASE}/admins`, data),
  toggleAdmin:     (id) => api.patch(`${BASE}/admins/${id}/toggle-status`),
  deleteAdmin:     (id) => api.delete(`${BASE}/admins/${id}`),

  // Audit Log
  getAuditLogs:    (params) => api.get(`${BASE}/audit-log`, { params }),
};
