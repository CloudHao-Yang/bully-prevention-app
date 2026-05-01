const BASE_URL = '/api/minimax/v1/messages';

export async function chatWithMiniMax(messages, systemPrompt) {
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7',
        max_tokens: 1000,
        system: systemPrompt + '\n\n【重要】\n1. 只输出角色台词，不要输出任何思考过程、推理、说明或前缀\n2. 回复要简短，像真实的小学生对话\n3. 用中文输出',
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    let result = '';

    if (data.content && Array.isArray(data.content)) {
      const textBlock = data.content.find(block => block.type === 'text');
      
      if (textBlock?.text) {
        result = textBlock.text.trim();
        
        const lastLine = result.split('\n').pop()?.trim();
        if (lastLine && lastLine.length < 100) {
          result = lastLine;
        }
      }
      
      if (!result) {
        const thinkingBlock = data.content.find(block => block.type === 'thinking');
        if (thinkingBlock?.thinking) {
          const lines = thinkingBlock.thinking.trim().split('\n');
          const lastLine = lines[lines.length - 1]?.trim();
          if (lastLine && lastLine.length < 100) {
            result = lastLine;
          } else {
            result = lines.find(l => l.trim().length > 0 && l.trim().length < 100) || lines[lines.length - 1]?.trim() || result;
          }
        }
      }
    }

    return result || '[无回复]';
    
  } catch (error) {
    console.error('[API] Error:', error);
    throw error;
  }
}
