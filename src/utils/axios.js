import axios from 'axios';

// Check if we're in browser environment (not during SSR/build)
const isBrowser = typeof window !== 'undefined';

// Create axios instance for Node.js backend (with credentials for auth)
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 30000, // 30 seconds
  withCredentials: true, // Important: Send cookies with requests for authentication
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create separate axios instance for Python API (without credentials to avoid CORS issues)
export const pythonAxios = axios.create({
  baseURL: import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8888',
  timeout: 30000,
  withCredentials: false, // No credentials needed for Python API
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging (only in browser)
axiosInstance.interceptors.request.use(
  (config) => {
    if (isBrowser) {
      console.log('🌐 Node API Request:', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error) => {
    if (isBrowser) {
      console.error('❌ Request Error:', error);
    }
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging and auth handling (only in browser)
axiosInstance.interceptors.response.use(
  (response) => {
    if (isBrowser) {
      console.log('✅ Node API Response:', response.config.url, response.status);
    }
    return response;
  },
  (error) => {
    if (isBrowser) {
      console.error('❌ Node API Error:', error.config?.url, error.response?.status, error.message);
      
      // Handle 401 Unauthorized - redirect to login ONLY if not already on login page
      if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
        // Don't redirect if this is the initial auth check
        if (!error.config?.url?.includes('/api/auth/me')) {
          console.log('🔒 Unauthorized - redirecting to login');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Add interceptors for Python API
pythonAxios.interceptors.request.use(
  (config) => {
    if (isBrowser) {
      console.log('🐍 Python API Request:', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error) => {
    if (isBrowser) {
      console.error('❌ Python Request Error:', error);
    }
    return Promise.reject(error);
  }
);

pythonAxios.interceptors.response.use(
  (response) => {
    if (isBrowser) {
      console.log('✅ Python API Response:', response.config.url, response.status);
    }
    return response;
  },
  (error) => {
    if (isBrowser) {
      console.error('❌ Python API Error:', error.config?.url, error.response?.status, error.message);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
