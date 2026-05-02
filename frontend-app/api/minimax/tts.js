export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'Method Not Allowed' }))
    return
  }

  const apiKey = normalizeApiKey(
    process.env.MINIMAX_SPEECH_API_KEY || process.env.MINIMAX_API_KEY || process.env.ANTHROPIC_API_KEY
  )
  if (!apiKey) {
    res.statusCode = 500
    res.setHeader('content-type', 'application/json')
    res.end(
      JSON.stringify({
        error: 'Missing API Key for TTS',
        present: {
          MINIMAX_SPEECH_API_KEY: Boolean(process.env.MINIMAX_SPEECH_API_KEY),
          MINIMAX_API_KEY: Boolean(process.env.MINIMAX_API_KEY),
          ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
        },
      })
    )
    return
  }

  let payload = req.body
  if (!payload) {
    const raw = await readRawBody(req)
    try {
      payload = raw ? JSON.parse(raw) : {}
    } catch (error) {
      res.statusCode = 400
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ error: 'Invalid JSON' }))
      return
    }
  }

  const text = typeof payload.text === 'string' ? payload.text.trim() : ''
  if (!text) {
    res.statusCode = 400
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'Missing text' }))
    return
  }

  const requestedModel = typeof payload.model === 'string' && payload.model.trim() ? payload.model.trim() : 'speech-2.8-hd'
  const voiceId =
    typeof payload.voice_id === 'string' && payload.voice_id.trim()
      ? payload.voice_id.trim()
      : process.env.MINIMAX_TTS_VOICE_ID || 'male-qn-qingse'
  const speed = clampNumber(payload.speed, 0.5, 2) ?? 1
  const vol = clampNumber(payload.vol, 0, 2) ?? 1
  const pitch = clampNumber(payload.pitch, -12, 12) ?? 0
  const emotion = typeof payload.emotion === 'string' && payload.emotion.trim() ? payload.emotion.trim() : undefined

  try {
    const modelsToTry = buildModelFallbackList(requestedModel)
    const endpoints = ['https://api.minimaxi.com/v1/t2a_v2', 'https://api-bj.minimaxi.com/v1/t2a_v2']
    const headerModes = ['authorization', 'both']

    const { audioHex, errorDetail } = await tryGenerateAudioHex({
      apiKey,
      endpoints,
      headerModes,
      modelsToTry,
      text,
      voiceId,
      speed,
      vol,
      pitch,
      emotion,
    })

    if (!audioHex) {
      const statusCode = errorDetail?.base_resp?.status_code
      if (statusCode === 2061) {
        res.statusCode = 403
        res.setHeader('content-type', 'application/json')
        res.end(
          JSON.stringify({
            error: 'TTS not available for current Token Plan key. Please confirm your plan includes Speech 2.8 quota and it is not exhausted.',
            detail: errorDetail?.base_resp || errorDetail,
          })
        )
        return
      }

      res.statusCode = 502
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ error: 'TTS failed', detail: errorDetail }))
      return
    }

    const audioBytes = Buffer.from(audioHex, 'hex')
    res.statusCode = 200
    res.setHeader('content-type', 'audio/mpeg')
    res.setHeader('cache-control', 'no-store')
    res.end(audioBytes)
  } catch (error) {
    res.statusCode = 502
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'Upstream request failed' }))
  }
}

async function tryGenerateAudioHex({
  apiKey,
  endpoints,
  headerModes,
  modelsToTry,
  text,
  voiceId,
  speed,
  vol,
  pitch,
  emotion,
}) {
  let lastError = null

  for (const endpoint of endpoints) {
    for (const headerMode of headerModes) {
      const headers = {
        'content-type': 'application/json',
      }
      if (headerMode === 'authorization') {
        headers.authorization = `Bearer ${apiKey}`
      } else {
        headers.authorization = `Bearer ${apiKey}`
        headers['x-api-key'] = apiKey
      }

      for (const model of modelsToTry) {
        const upstreamResponse = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model,
            text: text.slice(0, 3000),
            stream: false,
            voice_setting: {
              voice_id: voiceId,
              speed,
              vol,
              pitch,
              ...(emotion ? { emotion } : {}),
            },
            audio_setting: {
              sample_rate: 32000,
              bitrate: 128000,
              format: 'mp3',
              channel: 1,
            },
            output_format: 'hex',
          }),
        })

        const data = await upstreamResponse.json().catch(() => null)
        if (!upstreamResponse.ok) {
          lastError = data || { http_status: upstreamResponse.status }
          continue
        }

        const statusCode = data?.base_resp?.status_code
        if (typeof statusCode === 'number' && statusCode !== 0) {
          lastError = data
          if (statusCode === 2061) return { audioHex: '', errorDetail: data }
          continue
        }

        const audioHex = typeof data?.data?.audio === 'string' ? data.data.audio : ''
        if (audioHex) return { audioHex, errorDetail: null }

        lastError = data
      }
    }
  }

  return { audioHex: '', errorDetail: lastError }
}

function buildModelFallbackList(requested) {
  const known = [
    'speech-2.8-hd',
    'speech-2.8-turbo',
    'speech-2.6-hd',
    'speech-2.6-turbo',
    'speech-02-hd',
    'speech-02-turbo',
    'speech-01-hd',
    'speech-01-turbo',
  ]

  const trimmed = String(requested || '').trim()
  if (!trimmed) return known.slice()

  const list = [trimmed, ...known.filter((item) => item !== trimmed)]
  const seen = new Set()
  return list.filter((item) => {
    if (seen.has(item)) return false
    seen.add(item)
    return true
  })
}

function clampNumber(value, min, max) {
  const num = Number(value)
  if (Number.isNaN(num)) return null
  return Math.max(min, Math.min(max, num))
}

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

function readRawBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', () => resolve(''))
  })
}
