import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/minimax': {
        target: 'https://api.minimaxi.com/anthropic',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/minimax/, '')
      }
    }
  }
})
