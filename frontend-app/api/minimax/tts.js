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

  const apiKey = normalizeApiKey(process.env.MINIMAX_SPEECH_API_KEY || process.env.MINIMAX_API_KEY)
  if (!apiKey) {
    res.statusCode = 500
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'Missing MINIMAX_SPEECH_API_KEY' }))
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

  const model = typeof payload.model === 'string' && payload.model.trim() ? payload.model.trim() : 'speech-2.8-turbo'
  const voiceId =
    typeof payload.voice_id === 'string' && payload.voice_id.trim()
      ? payload.voice_id.trim()
      : process.env.MINIMAX_TTS_VOICE_ID || 'male-qn-qingse'
  const speed = clampNumber(payload.speed, 0.5, 2) ?? 1
  const vol = clampNumber(payload.vol, 0, 2) ?? 1
  const pitch = clampNumber(payload.pitch, -12, 12) ?? 0
  const emotion = typeof payload.emotion === 'string' && payload.emotion.trim() ? payload.emotion.trim() : undefined

  try {
    const upstreamResponse = await fetch('https://api.minimaxi.com/v1/t2a_v2', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
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
      res.statusCode = upstreamResponse.status
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ error: 'Upstream error', detail: data }))
      return
    }

    const statusCode = data?.base_resp?.status_code
    if (typeof statusCode === 'number' && statusCode !== 0) {
      if (statusCode === 2061) {
        res.statusCode = 403
        res.setHeader('content-type', 'application/json')
        res.end(
          JSON.stringify({
            error: 'Token Plan key does not support TTS on /v1/t2a_v2',
            detail: data?.base_resp || data,
          })
        )
        return
      }
      res.statusCode = 502
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ error: 'TTS failed', detail: data?.base_resp || data }))
      return
    }

    const audioHex = typeof data?.data?.audio === 'string' ? data.data.audio : ''
    if (!audioHex) {
      res.statusCode = 502
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ error: 'Empty audio', detail: data }))
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
