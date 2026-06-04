import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isDesktop = process.env.BUILD_TARGET === 'desktop'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        // Dev server: proxy to backend (Docker = backend:8000, local = localhost:8000)
        target: process.env.BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Desktop build: all assets use relative paths so FastAPI can serve them
    assetsDir: 'assets',
  },
  base: isDesktop ? './' : '/',
})
