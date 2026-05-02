import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import doubaoTtsHandler from './api/doubao/tts.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'doubao-tts-dev-middleware',
      configureServer(server) {
        server.middlewares.use('/api/doubao/tts', async (req, res, next) => {
          try {
            await doubaoTtsHandler(req, res)
          } catch (error) {
            next(error)
          }
        })
      },
    },
  ],
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
