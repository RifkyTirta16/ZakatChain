import axios from 'axios';

const resolveApiBase = (): string => {
  const configured = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  if (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1' &&
    configured.includes('localhost')
  ) {
    // Allow scanning QR from a mobile phone over LAN via Vite's /api proxy.
    return '/api';
  }
  return configured;
};

const API_BASE = resolveApiBase();

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to automatically add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('zakat_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error.config?.url ?? '');
    const isAuthRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('zakat_token');
      localStorage.removeItem('zakat_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
