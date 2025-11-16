// Centralized API Configuration
// All API endpoints should use these constants

// Python Server API (for ESP32 communication, power management, etc.)
export const PYTHON_API_URL = import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8888';

// Node.js Backend API (for MongoDB operations)
export const NODE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Full API paths
export const API = {
  // Python Server endpoints (ESP32 only + face recognition)
  python: {
    extractFace: `${PYTHON_API_URL}/api/extract-face-embedding`,
  },
  
  // Node.js Backend endpoints (use relative paths for Vite proxy)
  node: {
    // Bus Routes
    busRoutes: '/api/bus-routes',
    busSchedule: (busId) => `/api/bus-schedule/${busId}`,
    saveBusSchedule: '/api/bus-schedule',
    
    // Power Management (moved from Python)
    buses: '/api/power-config',              // GET all buses
    powerConfig: '/api/power-config',        // POST/DELETE power config
    syncPowerConfig: '/api/sync-power-config',
  }
};

export default API;
