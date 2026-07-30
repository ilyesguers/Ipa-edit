import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  const tg = window.Telegram?.WebApp;
  if (tg?.initData) config.headers['x-telegram-init-data'] = tg.initData;
  return config;
});

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) { localStorage.removeItem('admin_token'); window.location.reload(); }
  return Promise.reject(err);
});

export default api;
