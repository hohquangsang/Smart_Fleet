import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 + auto refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });

        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.clear();
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ─── Forgot Password API helpers ──────────────────────────────────

/** Bước 1: Gửi OTP về email */
export const forgotPasswordApi = (email) =>
  api.post('/auth/forgot-password', { email });

/** Bước 2: Xác minh OTP, nhận reset token */
export const verifyOtpApi = (email, otp) =>
  api.post('/auth/verify-otp', { email, otp });

/** Bước 3: Đặt mật khẩu mới */
export const resetPasswordApi = (email, resetToken, newPassword, confirmPassword) =>
  api.post('/auth/reset-password', { email, resetToken, newPassword, confirmPassword });
