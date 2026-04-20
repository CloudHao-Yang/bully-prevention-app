import { chatWithMiniMax } from './api';

// AI 生成场景的系统提示词（全中文）
const SCENARIO_GENERATOR_PROMPT = `你是一位专业的儿童心理教育专家，擅长将孩子描述的校园欺凌经历转化为有趣的教育剧本。

【重要语言要求】
- 你必须使用中文输出所有内容
- 角色名要符合中国小学生的命名习惯（如：小明、小刚、小红等）
- 所有描述、旁白、提示词都要用中文

【你的任务】
根据用户描述的故事，生成一个完整的角色扮演场景。

【输出格式】
请严格按照以下JSON格式输出，只输出JSON，不要添加任何解释：

{
  "title": "场景标题（10字以内）",
  "description": "场景描述（30字以内）",
  "difficulty": "简单/中等/困难",
  "characters": [
    {
      "id": "victim",
      "name": "被欺负的角色名",
      "role": "被针对的同学",
      "personality": "性格特点",
      "emoji": "相关emoji",
      "color": "#颜色代码",
      "systemPrompt": "角色扮演的系统提示词，要求：1. 设定角色背景和性格 2. 明确任务 3. 限制回复长度不超过30个字 4. 要求只输出台词，不要思考过程"
    },
    {
      "id": "bully",
      "name": "欺凌者角色名",
      "role": "欺负人的同学",
      "personality": "性格特点",
      "emoji": "相关emoji",
      "color": "#颜色代码",
      "systemPrompt": "角色扮演的系统提示词，要求：1. 设定角色背景和性格 2. 明确任务 3. 限制回复长度不超过30个字 4. 要求只输出台词，不要思考过程"
    }
  ],
  "victimNarrator": "作为被欺负角色时的开场旁白",
  "victimScene": "作为被欺负角色时的场景描述",
  "bystanderNarrator": "作为帮助者角色时的开场旁白",
  "bystanderScene": "作为帮助者角色时的场景描述",
  "accompliceNarrator": "作为跟风者角色时的开场旁白",
  "accompliceScene": "作为跟风者角色时的场景描述",
  "observerNarrator": "作为观察者角色时的开场旁白",
  "observerScene": "作为观察者角色时的场景描述",
  "reviewPrompt": "复盘提示词，要求：1. 温暖鼓励的语气 2. 分析角色表现 3. 给出建议 4. 不超过250字"
}

【重要规则】
1. 角色名要符合中国小学生的命名习惯
2. 性格设定要真实，符合10岁左右的孩子
3. systemPrompt 要让角色扮演自然、真实，像真实的小学生说话
4. 回复要简短，像真实的小学生对话，不要过度表演
5. JSON格式必须正确，可以被JSON.parse解析
6. 只输出JSON，不要输出任何其他内容`;

// 根据故事生成场景
export async function generateScenarioFromStory(story) {
  if (!story.trim()) {
    throw new Error('请先描述你的故事');
  }

  const userMessage = `请根据以下故事生成一个角色扮演场景（请用中文输出）：

${story}

请生成一个适合教育的场景，包含至少2个角色（被欺负的人和欺凌者）。`;

  try {
    const result = await chatWithMiniMax(
      [{ role: 'user', content: userMessage }],
      SCENARIO_GENERATOR_PROMPT
    );

    // 尝试解析 JSON
    let scenarioData;
    try {
      // 尝试提取 JSON（可能包含在反引号中）
      const jsonMatch = result.match(/```json\n?([\s\S]*?)\n?```/) || result.match(/```\n?([\s\S]*?)\n?```/) || result.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : result;
      scenarioData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON解析失败，使用默认结构:', parseError);
      // 如果解析失败，创建一个基本场景
      scenarioData = createBasicScenario(story);
    }

    // 验证并补全场景数据
    return validateAndCompleteScenario(scenarioData, story);
  } catch (error) {
    console.error('生成场景失败:', error);
    throw new Error('生成场景失败，请重试');
  }
}

// 创建基本场景（当AI生成失败时使用）
function createBasicScenario(story) {
  return {
    title: '我的故事',
    description: '根据你的故事生成',
    difficulty: '中等',
    characters: [
      {
        id: 'victim',
        name: '小明',
        role: '被针对的同学',
        personality: '内向、敏感',
        emoji: '🛡️',
        color: '#E8A0A0',
        systemPrompt: `【场景设定】
- 你扮演：故事中被欺负的同学
- 对方：欺负你的人
- 你的性格：内向、敏感

【你的任务】
根据对话历史，以你的身份回应。
规则：
1. 真实表达你的感受
2. 回复不超过30个字
3. 直接输出台词

直接输出你的台词，不要加任何前缀。`,
      },
      {
        id: 'bully',
        name: '小刚',
        role: '欺负人的同学',
        personality: '调皮',
        emoji: '😈',
        color: '#FFB366',
        systemPrompt: `你是一个调皮的小学生，正在欺负同学。
你的性格：调皮、爱出风头。

任务：根据对话历史，以你的身份回应。
规则：
1. 保持调皮但不过分的风格
2. 回复不超过30个字，像小学生说话

重要：只输出你的台词。`,
      },
    ],
    victimNarrator: '你遇到了这种情况...',
    victimScene: '（这一幕正在发生...）',
    bystanderNarrator: '你的朋友被欺负了，你会怎么做？',
    bystanderScene: '（你看到朋友被欺负...）',
    accompliceNarrator: '大家都在...你心里怎么想？',
    accompliceScene: '（这一幕正在发生...）',
    observerNarrator: '你静静地看着这一切...',
    observerScene: '（你看到了这一幕...）',
    reviewPrompt: `你是一位温柔的心理老师。请根据角色扮演记录，写一份温暖的复盘报告。要求：1. 肯定参与 2. 分析表现 3. 给出建议 4. 鼓励孩子 5. 不超过250字。`,
  };
}

// 验证并补全场景数据
function validateAndCompleteScenario(data, originalStory) {
  const defaultScenario = {
    title: data.title || '我的故事',
    description: data.description || '根据你的故事生成',
    difficulty: data.difficulty || '中等',
    story: originalStory,
    characters: data.characters || [],
    victimNarrator: data.victimNarrator || '你遇到了这种情况...',
    victimScene: data.victimScene || '（这一幕正在发生...）',
    bystanderNarrator: data.bystanderNarrator || '你的朋友被欺负了，你会怎么做？',
    bystanderScene: data.bystanderScene || '（你看到朋友被欺负...）',
    accompliceNarrator: data.accompliceNarrator || '大家都在...你心里怎么想？',
    accompliceScene: data.accompliceScene || '（这一幕正在发生...）',
    observerNarrator: data.observerNarrator || '你静静地看着这一切...',
    observerScene: data.observerScene || '（你看到了这一幕...）',
    reviewPrompt: data.reviewPrompt || '请写一份温暖的复盘报告。',
    maxRounds: 4,
    isDefault: false,
    createdBy: 'user',
    createdAt: Date.now(),
  };

  // 为角色添加背景色
  defaultScenario.characters = defaultScenario.characters.map((char, index) => ({
    ...char,
    bg: index === 0 
      ? 'linear-gradient(135deg, #FFF5F5 0%, #FFE4E4 100%)' 
      : 'linear-gradient(135deg, #FFF8F0 0%, #FFE4CC 100%)',
    avatar: char.avatar || '',
  }));

  return defaultScenario;
}

// 生成场景摘要（用于预览）
export async function generateScenarioSummary(story) {
  if (!story.trim()) return null;

  const prompt = `根据以下故事，用50字以内总结这个欺凌场景的核心要点（请用中文）：
  
${story}`;

  try {
    const result = await chatWithMiniMax(
      [{ role: 'user', content: prompt }],
      '你是一个场景摘要专家。请用中文简洁总结故事要点。'
    );
    return result.trim();
  } catch (error) {
    return story.slice(0, 50) + '...';
  }
}
