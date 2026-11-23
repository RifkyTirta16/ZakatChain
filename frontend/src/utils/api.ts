import axios from 'axios';

const resolveApiBase = (): string => {
  if (import.meta.env.DEV) {
    // Route dev requests through Vite's same-origin proxy so HttpOnly SameSite=Lax
    // session cookies work uniformly on localhost, 127.0.0.1, and LAN previews.
    return '/api';
  }
  return import.meta.env.VITE_API_URL || '/api';
};

const API_BASE = resolveApiBase();

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response Interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error.config?.url ?? '');
    const apiErrMsg = String((error.response?.data as { error?: string } | undefined)?.error ?? '');
    const isCredentialMismatch =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/me') ||
      (requestUrl.includes('/auth/password') && apiErrMsg.includes('Kata sandi saat ini'));
    if (error.response?.status === 401 && !isCredentialMismatch) {
      localStorage.removeItem('zakat_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
