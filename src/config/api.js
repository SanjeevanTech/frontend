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
