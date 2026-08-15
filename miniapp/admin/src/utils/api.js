import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 20000 });

api.interceptors.request.use((config) => {
  const isAuthAttempt = String(config.url || '').includes('/auth/telegram') || String(config.url || '').includes('/auth/admin-login');
  const token = localStorage.getItem('admin_token');
  if (token && !isAuthAttempt) config.headers['Authorization'] = `Bearer ${token}`;
  const tg = window.Telegram?.WebApp;
  if (tg?.initData && !token && !isAuthAttempt) config.headers['x-telegram-init-data'] = tg.initData;
  return config;
});

api.interceptors.response.use(r => r, err => {
  const isLoginAttempt = String(err.config?.url || '').includes('/auth/admin-login');
  if (err.response?.status === 401 && !isLoginAttempt) {
    localStorage.removeItem('admin_token');
    window.dispatchEvent(new CustomEvent('admin-auth-expired'));
  }
  return Promise.reject(err);
});

export default api;
