import { sendMiniMaxMessage } from './api';

const fallbackFeedback = {
  risk: { label: '观察中', level: 50 },
  pressure: { label: '需要照顾', level: 58 },
  support: { label: '可寻找', level: 45 },
  control: { label: '未变化', level: 50 },
};

function clampNumber(value, min, max) {
  const num = Number(value);
  if (Number.isNaN(num)) return min;
  return Math.max(min, Math.min(max, num));
}

function normalizeFeedback(feedback) {
  const base = feedback && typeof feedback === 'object' ? feedback : {};
  return {
    risk: {
      label: String(base.risk?.label || fallbackFeedback.risk.label),
      level: clampNumber(base.risk?.level ?? fallbackFeedback.risk.level, 0, 100),
    },
    pressure: {
      label: String(base.pressure?.label || fallbackFeedback.pressure.label),
      level: clampNumber(base.pressure?.level ?? fallbackFeedback.pressure.level, 0, 100),
    },
    support: {
      label: String(base.support?.label || fallbackFeedback.support.label),
      level: clampNumber(base.support?.level ?? fallbackFeedback.support.level, 0, 100),
    },
    control: {
      label: String(base.control?.label || fallbackFeedback.control.label),
      level: clampNumber(base.control?.level ?? fallbackFeedback.control.level, 0, 100),
    },
  };
}

function extractJson(text) {
  if (!text) return null;
  const match =
    text.match(/```json\s*([\s\S]*?)\s*```/i) ||
    text.match(/```\s*([\s\S]*?)\s*```/i) ||
    text.match(/(\{[\s\S]*\})/);
  const jsonStr = match ? match[1] : text;
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    return null;
  }
}

function formatHistory(history) {
  const items = (history || []).filter((item) => item && typeof item.text === 'string')
  const scene = items.find((item) => item.type === 'scene')
  const tail = items.filter((item) => item.type !== 'scene').slice(-18)
  const merged = scene ? [scene, ...tail] : tail

  return merged
    .map((item) => {
      if (item.type === 'scene') return `【场景】${item.text}`;
      if (item.type === 'user') return `【你】${item.text}`;
      return `【对方】${item.text}`;
    })
    .join('\n');
}

export async function generatePracticeBeat({ scenario, role, history, round }) {
  const roleLabel = `${role?.title || ''}（${role?.name || ''}）`.trim();
  const scenarioTitle = scenario?.title || '校园情境';
  const scenarioSummary = scenario?.summary || scenario?.description || '';
  const transcript = formatHistory(history || []);
  const turn = clampNumber(round, 0, 99) + 1;

  const system = `你是一位儿童心理教育专家和互动编剧，负责把校园冲突情境推进到下一轮。

你必须遵守以下边界：
1. 全程使用中文
2. 不生成血腥暴力内容，不输出高强度羞辱细节
3. 不鼓励报复、偷拍视频、曝光他人
4. 不做“谁是坏孩子”的人格定性，用“行为/边界/后果”来描述
5. 如果出现明显高危线索（自伤、暴力威胁、性侵等），停止推进剧情，转为提醒求助老师/家长/心理老师

请严格只输出 JSON，不要输出解释，不要输出 Markdown。

输出 JSON 格式如下：
{
  "npc": "对方/现场的下一句回应（不超过40字）",
  "note": "这一轮发生了什么变化（不超过80字）",
  "nextTip": "下一种可能的提醒（不超过50字）",
  "feedback": {
    "risk": { "label": "2-6字短语", "level": 0-100 },
    "pressure": { "label": "2-6字短语", "level": 0-100 },
    "support": { "label": "2-6字短语", "level": 0-100 },
    "control": { "label": "2-6字短语", "level": 0-100 }
  }
}`;

  const user = `情境标题：${scenarioTitle}
情境摘要：${scenarioSummary}
你的视角：${roleLabel}
当前是第 ${turn} 轮推进。

对话记录：
${transcript}

请生成下一句情境回应与反馈。`;

  const result = await sendMiniMaxMessage({
    system,
    messages: [{ role: 'user', content: user }],
    max_tokens: 650,
  });

  const parsed = extractJson(result);
  const npc = typeof parsed?.npc === 'string' && parsed.npc.trim() ? parsed.npc.trim() : '对方没有立刻接话，只是盯着你看。';
  const note = typeof parsed?.note === 'string' && parsed.note.trim() ? parsed.note.trim() : '这一轮让现场的注意力发生了变化，你可以继续观察对方的下一步。';
  const nextTip = typeof parsed?.nextTip === 'string' && parsed.nextTip.trim() ? parsed.nextTip.trim() : '下一步可以试试更清楚地表达边界，或寻找支持。';

  return {
    npc,
    note,
    nextTip,
    feedback: normalizeFeedback(parsed?.feedback),
  };
}
