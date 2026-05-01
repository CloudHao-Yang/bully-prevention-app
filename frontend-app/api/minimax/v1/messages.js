async function readRawBody(req) {
  if (req.body) {
    if (typeof req.body === 'string') return req.body
    return JSON.stringify(req.body)
  }

  return await new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) {
    res.statusCode = 500
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'MINIMAX_API_KEY is not set' }))
    return
  }

  try {
    const body = await readRawBody(req)

    const upstream = await fetch('https://api.minimaxi.com/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body,
    })

    const text = await upstream.text()
    res.statusCode = upstream.status
    res.setHeader('content-type', upstream.headers.get('content-type') || 'application/json')
    res.end(text)
  } catch {
    res.statusCode = 500
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'Upstream request failed' }))
  }
}

