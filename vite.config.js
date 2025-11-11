import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      port: 5173,  // Vite default port
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:5000',  // Use env variable or fallback to localhost
          changeOrigin: true,
          secure: false,  // Allow self-signed certificates in development
        }
      }
    }
  }
})
