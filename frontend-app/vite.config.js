import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
function minimaxProxy() {
  return {
    name: 'minimax-proxy',
    configureServer(server) {
      server.middlewares.use('/api/minimax/v1/messages', (req, res, next) => {
        if (req.method !== 'POST') return next()

        const apiKey = process.env.MINIMAX_API_KEY
        if (!apiKey) {
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'MINIMAX_API_KEY is not set' }))
          return
        }

        const chunks = []
        req.on('data', (chunk) => chunks.push(chunk))
        req.on('end', async () => {
          try {
            const upstream = await fetch('https://api.minimaxi.com/anthropic/v1/messages', {
              method: 'POST',
              headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
              },
              body: Buffer.concat(chunks),
            })

            const text = await upstream.text()
            res.statusCode = upstream.status
            res.setHeader('content-type', upstream.headers.get('content-type') || 'application/json')
            res.end(text)
          } catch {
            res.statusCode = 500
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: 'Proxy request failed' }))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env = { ...process.env, ...env }

  return {
    plugins: [react(), minimaxProxy()],
  }
})
