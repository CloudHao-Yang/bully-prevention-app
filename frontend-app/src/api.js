const BASE_URL = '/api/minimax/v1/messages';
const DEFAULT_MODEL = 'MiniMax-M2.7';
const DEFAULT_MAX_TOKENS = 1000;
const DEFAULT_ANTHROPIC_VERSION = '2023-06-01';

function extractTextFromResponse(data) {
  if (!data || !Array.isArray(data.content)) return '';
  const textBlock = data.content.find((block) => block.type === 'text');
  if (textBlock?.text) return textBlock.text.trim();

  const thinkingBlock = data.content.find((block) => block.type === 'thinking');
  if (thinkingBlock?.thinking) return thinkingBlock.thinking.trim();

  return '';
}

export async function sendMiniMaxMessage({
  messages,
  system,
  model = DEFAULT_MODEL,
  max_tokens = DEFAULT_MAX_TOKENS,
}) {
  const headers = {
    'anthropic-version': DEFAULT_ANTHROPIC_VERSION,
    'content-type': 'application/json',
  };

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens,
      system,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return extractTextFromResponse(data) || '[无回复]';
}

export async function chatWithMiniMax(messages, systemPrompt) {
  return sendMiniMaxMessage({ messages, system: systemPrompt });
}
