export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const apiKey = process.env.DOUBAO_TTS_API_KEY;
  const resourceId = process.env.DOUBAO_TTS_RESOURCE_ID || 'seed-tts-2.0';
  const defaultSpeaker = process.env.DOUBAO_TTS_SPEAKER || 'zh_female_xiaoxue_uranus_bigtts';

  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing DOUBAO_TTS_API_KEY' }));
    return;
  }

  let payload = req.body;
  if (!payload) {
    const raw = await readRawBody(req);
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch (error) {
      res.statusCode = 400;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }
  }

  const text = typeof payload.text === 'string' ? payload.text.trim() : '';
  if (!text) {
    res.statusCode = 400;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing text' }));
    return;
  }

  const speaker = typeof payload.speaker === 'string' && payload.speaker.trim() ? payload.speaker.trim() : defaultSpeaker;
  const format = payload.format === 'pcm' || payload.format === 'ogg_opus' ? payload.format : 'mp3';
  const sampleRate = clampNumber(payload.sampleRate, 8000, 48000) || 24000;
  const bitRate = clampNumber(payload.bitRate, 16000, 160000) || 128000;

  try {
    const upstreamResponse = await fetch('https://openspeech.bytedance.com/api/v3/tts/unidirectional', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'x-api-resource-id': resourceId,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        user: { uid: payload.uid || 'bully-demo' },
        namespace: 'BidirectionalTTS',
        req_params: {
          text: text.slice(0, 800),
          speaker,
          audio_params: {
            format,
            sample_rate: sampleRate,
            bit_rate: bitRate,
          },
        },
      }),
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      res.statusCode = upstreamResponse.status;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'Upstream error', detail: errorText.slice(0, 2000) }));
      return;
    }

    const { audio, logid } = await collectChunkedAudio(upstreamResponse);
    if (!audio || audio.length === 0) {
      res.statusCode = 502;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'Empty audio', logid: logid || null }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('content-type', format === 'ogg_opus' ? 'audio/ogg' : format === 'pcm' ? 'audio/pcm' : 'audio/mpeg');
    res.setHeader('cache-control', 'no-store');
    res.end(audio);
  } catch (error) {
    res.statusCode = 502;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'Upstream request failed' }));
  }
}

async function collectChunkedAudio(response) {
  const decoder = new TextDecoder();
  const chunks = [];
  let buffer = '';

  const logid = response.headers.get('x-tt-logid');

  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await response.text();
    const audio = extractAudioFromText(text);
    return { audio, logid };
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const jsonStr = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
      const obj = safeJsonParse(jsonStr);
      if (!obj) continue;
      const audioBase64 = typeof obj.data === 'string' ? obj.data : typeof obj.audio === 'string' ? obj.audio : '';
      if (audioBase64) {
        chunks.push(Buffer.from(audioBase64, 'base64'));
      }
    }
  }

  const audio = chunks.length ? Buffer.concat(chunks) : Buffer.alloc(0);
  return { audio, logid };
}

function extractAudioFromText(text) {
  const chunks = [];
  for (const line of String(text || '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const jsonStr = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed;
    const obj = safeJsonParse(jsonStr);
    if (!obj) continue;
    const audioBase64 = typeof obj.data === 'string' ? obj.data : typeof obj.audio === 'string' ? obj.audio : '';
    if (audioBase64) chunks.push(Buffer.from(audioBase64, 'base64'));
  }
  return chunks.length ? Buffer.concat(chunks) : Buffer.alloc(0);
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function clampNumber(value, min, max) {
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Math.max(min, Math.min(max, num));
}

function readRawBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', () => resolve(''));
  });
}

