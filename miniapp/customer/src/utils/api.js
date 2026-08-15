import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// Customer bearer tokens live in memory and are attached after a successful
// credential login. They are deliberately not restored from localStorage.

// Customer requests intentionally use only the administrator-issued JWT.
// Telegram initData must not override the credential identity after login.
api.interceptors.request.use((config) => config);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      const isLoginRequest = String(err.config?.url || '').includes('/auth/');
      if (!isLoginRequest) window.dispatchEvent(new CustomEvent('customer-auth-expired'));
    }
    return Promise.reject(err);
  }
);

export default api;
