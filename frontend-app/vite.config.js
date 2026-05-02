import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import doubaoTtsHandler from './api/doubao/tts.js'
import minimaxHandler from './api/minimax/v1/messages.js'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.DOUBAO_TTS_API_KEY = process.env.DOUBAO_TTS_API_KEY || env.DOUBAO_TTS_API_KEY
  process.env.DOUBAO_TTS_RESOURCE_ID = process.env.DOUBAO_TTS_RESOURCE_ID || env.DOUBAO_TTS_RESOURCE_ID
  process.env.DOUBAO_TTS_SPEAKER = process.env.DOUBAO_TTS_SPEAKER || env.DOUBAO_TTS_SPEAKER
  process.env.MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || env.MINIMAX_API_KEY

  return {
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
      {
        name: 'minimax-dev-middleware',
        configureServer(server) {
          server.middlewares.use('/api/minimax/v1/messages', async (req, res, next) => {
            try {
              await minimaxHandler(req, res)
            } catch (error) {
              next(error)
            }
          })
        },
      },
    ],
    server: {}
  }
})
