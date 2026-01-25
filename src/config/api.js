// Centralized API Configuration
// All API endpoints should use these constants

// Python Server API (for ESP32 communication, face recognition, etc.)
// In production, we proxy through the Node backend to avoid Mixed Content errors
export const PYTHON_API_URL = import.meta.env.PROD
  ? '/api/python'
  : (import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8888');

// Node.js Backend API (for MongoDB operations)
// In production (Vercel), we use relative paths to trigger the Vercel Proxy (fixes Mixed Content / HTTPS errors)
export const NODE_API_URL = import.meta.env.PROD
  ? ''
  : (import.meta.env.VITE_API_URL || 'http://localhost:5000');

// Full API paths
export const API = {
  // Python Server endpoints (relative to pythonAxios baseURL)
  python: {
    extractFace: '/api/extract-face-embedding',
  },

  // Node.js Backend endpoints
  node: {
    // Bus Routes
    busRoutes: `${NODE_API_URL}/api/bus-routes`,
    busSchedule: (busId) => `${NODE_API_URL}/api/bus-schedule/${busId}`,
    saveBusSchedule: `${NODE_API_URL}/api/bus-schedule`,

    // Power Management (moved from Python)
    buses: `${NODE_API_URL}/api/power-config`,              // GET all buses
    powerConfig: `${NODE_API_URL}/api/power-config`,        // POST/DELETE power config
    syncPowerConfig: `${NODE_API_URL}/api/power-config/sync`,

    // Contractors
    contractors: `${NODE_API_URL}/api/contractors`,

    // Device Provisioning (WiFi/Server URL)
    deviceConfigGet: `${NODE_API_URL}/api/device-config/get`,
    deviceConfigAll: `${NODE_API_URL}/api/device-config/all`,
    deviceConfigUpdate: `${NODE_API_URL}/api/device-config/update`
  }
};

export default API;
