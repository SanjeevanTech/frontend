import axios from 'axios';

// Check if we're in browser environment (not during SSR/build)
const isBrowser = typeof window !== 'undefined';

// Create axios instance with base URL from environment variable
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging (only in browser)
axiosInstance.interceptors.request.use(
  (config) => {
    if (isBrowser) {
      console.log('🌐 API Request:', config.method?.toUpperCase(), config.url);
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

// Add response interceptor for debugging (only in browser)
axiosInstance.interceptors.response.use(
  (response) => {
    if (isBrowser) {
      console.log('✅ API Response:', response.config.url, response.status);
    }
    return response;
  },
  (error) => {
    if (isBrowser) {
      console.error('❌ API Error:', error.config?.url, error.response?.status, error.message);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
