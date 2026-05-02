import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import doubaoTtsHandler from './api/doubao/tts.js'
import minimaxHandler from './api/minimax/v1/messages.js'
import minimaxTtsHandler from './api/minimax/tts.js'
import fs from 'node:fs'
import path from 'node:path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const rawEnv = readDotEnvLocal(process.cwd())
  const env = loadEnv(mode, process.cwd(), '')
  process.env.DOUBAO_TTS_API_KEY = process.env.DOUBAO_TTS_API_KEY || env.DOUBAO_TTS_API_KEY
  process.env.DOUBAO_TTS_RESOURCE_ID = process.env.DOUBAO_TTS_RESOURCE_ID || env.DOUBAO_TTS_RESOURCE_ID
  process.env.DOUBAO_TTS_SPEAKER = process.env.DOUBAO_TTS_SPEAKER || env.DOUBAO_TTS_SPEAKER
  process.env.MINIMAX_SPEECH_API_KEY =
    process.env.MINIMAX_SPEECH_API_KEY ||
    normalizeApiKey(rawEnv.MINIMAX_SPEECH_API_KEY) ||
    normalizeApiKey(env.MINIMAX_SPEECH_API_KEY)
  process.env.MINIMAX_API_KEY =
    process.env.MINIMAX_API_KEY ||
    normalizeApiKey(rawEnv.MINIMAX_API_KEY) ||
    normalizeApiKey(rawEnv.ANTHROPIC_API_KEY) ||
    normalizeApiKey(env.MINIMAX_API_KEY) ||
    normalizeApiKey(env.ANTHROPIC_API_KEY)

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
          server.middlewares.use('/api/minimax/tts', async (req, res, next) => {
            try {
              await minimaxTtsHandler(req, res)
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

function normalizeApiKey(value) {
  if (!value) return ''
  let key = String(value).trim()
  if (!key) return ''
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim()
  }
  if (key.startsWith('${') && key.endsWith('}')) {
    key = key.slice(2, -1).trim()
  }
  if (/^Bearer[;\s]+/i.test(key)) {
    key = key.replace(/^Bearer[;\s]+/i, '').trim()
  }
  return key
}

function readDotEnvLocal(rootDir) {
  const envPath = path.join(rootDir, '.env.local')
  try {
    const content = fs.readFileSync(envPath, 'utf8')
    const result = {}
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const normalized = line.startsWith('export ') ? line.slice(7).trim() : line
      const eqIndex = normalized.indexOf('=')
      if (eqIndex <= 0) continue
      const key = normalized.slice(0, eqIndex).trim()
      const value = normalized.slice(eqIndex + 1).trim()
      result[key] = value
    }
    return result
  } catch (error) {
    return {}
  }
}
