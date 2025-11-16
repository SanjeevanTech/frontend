import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react(),
      tailwindcss(),
    ],
    server: {
      port: 5173,  // Vite default port
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:5000',  // Use env variable or fallback to localhost
          changeOrigin: true,
          secure: false,  // Allow self-signed certificates in development
        }
      }
    },
    build: {
      // Enable minification
      minify: 'terser',
      terser: {
        compress: {
          drop_console: true, // Remove console.logs in production
          drop_debugger: true,
        },
      },
      // Optimize chunk splitting
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom'],
            'router-vendor': ['react-router-dom'],
            'utils-vendor': ['axios', 'date-fns', 'react-hot-toast'],
          },
        },
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Source maps for production debugging (optional, disable for smaller builds)
      sourcemap: false,
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'axios', 'date-fns'],
    },
  }
})
