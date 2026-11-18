import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

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
    if (error.response?.status === 401) {
      localStorage.removeItem('zakat_token');
      localStorage.removeItem('zakat_user');
      window.location.href = '/'; // Redirect to login
    }
    return Promise.reject(error);
  }
);

export default apiClient;
