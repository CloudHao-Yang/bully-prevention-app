// 本地存储工具 - 管理场景数据的持久化

const STORAGE_KEYS = {
  SCENARIOS: 'bully_scenarios',
  USER_STORIES: 'bully_user_stories',
  PRACTICE_LOGS: 'bully_practice_logs',
  SETTINGS: 'bully_settings',
  NOTIFICATION: 'bully_notification',
};

// 通知管理
export function setNotification(message, type = 'success') {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATION, JSON.stringify({ message, type, timestamp: Date.now() }));
  } catch (e) {
    console.error('保存通知失败:', e);
  }
}

export function getNotification() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.NOTIFICATION);
    if (stored) {
      const notification = JSON.parse(stored);
      // 通知5秒后自动过期
      if (Date.now() - notification.timestamp < 5000) {
        return notification;
      }
      clearNotification();
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function clearNotification() {
  try {
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATION);
  } catch (e) {
    console.error('清除通知失败:', e);
  }
}

// 默认场景 - 欺凌场景预设
export const DEFAULT_SCENARIOS = [
  {
    id: 'default_1',
    title: '被起外号',
    description: '同学给你起了难听的外号，你该怎么办？',
    story: '小明因为戴眼镜，被小刚起了"四眼田鸡"的外号，每次看到小明，小刚都会大声喊这个外号，让全班同学都笑话他。',
    difficulty: 'easy',
    characters: [
      {
        id: 'victim',
        name: '小明',
        role: '被针对的同学',
        personality: '内向、敏感、善良',
        emoji: '🛡️',
        color: '#E8A0A0',
        bg: 'linear-gradient(135deg, #FFF5F5 0%, #FFE4E4 100%)',
        systemPrompt: `【场景设定】
- 你扮演：小明，一个被叫"四眼田鸡"的小学生
- 对方：小刚，正在欺负你，给你起外号
- 你的性格：内向、敏感、但善良；心情是委屈、无奈

【你的任务】
小刚（NPC）说了一句话，请你以小明的身份回应他。
规则：
1. 小明是受害者，被叫外号时可能会沉默、委屈、愤怒、或无奈
2. 不要过度表演"完美应对"，要真实
3. 如果你觉得不想说话，也可以沉默或走开
4. 回复不超过30个字，像10岁小学生说话

直接输出小明的台词，不要加任何描述前缀。`,
        avatar: '',
      },
      {
        id: 'bully',
        name: '小刚',
        role: '欺负人的同学',
        personality: '调皮、爱出风头',
        emoji: '😈',
        color: '#FFB366',
        bg: 'linear-gradient(135deg, #FFF8F0 0%, #FFE4CC 100%)',
        systemPrompt: `你是小刚，一个调皮的小学生，正在给小明起外号"四眼田鸡"。小明在你旁边，低头不说话。场景中有其他同学（小亮、小强等）在场。

你的性格：调皮、爱出风头、喜欢引人注意。本质不是大坏人，只是喜欢逗人。会观察别人的反应来调整自己的行为。

任务：根据对话历史，以小刚的身份回应。规则：
1. 如果有人帮小明说话或小明反击 → 你可能更起劲或暂时收敛
2. 如果有人幽默化解或威胁告老师 → 你可能觉得无趣而暂时停止
3. 如果气氛变冷 → 你可能换个方式继续
4. 保持调皮但不过分霸道的风格
5. 回复不超过30个字，像10岁小学生说话

重要：只输出小刚的台词，不要输出任何思考过程、推理说明、动作描述或前缀。`,
        avatar: '',
      },
    ],
    victimNarrator: '你听到了这个外号，你的心一下子沉了下去...',
    victimScene: '（走进教室，几个同学在笑，其中一个大声喊："哟，四眼田鸡来啦！"）',
    bystanderNarrator: '你的好朋友小明被欺负了，你会怎么做？',
    bystanderScene: '（课间，你看到小刚在围着小明叫"四眼田鸡"，小明低着头不说话...）',
    accompliceNarrator: '大家都在笑，你也在笑，但你心里真的觉得好笑吗？',
    accompliceScene: '（课间，有人带头喊"四眼田鸡"，全班都在笑，你也...）',
    observerNarrator: '你静静地看着这一切，没有人注意到你。你会怎么做？',
    observerScene: '（你坐在教室角落，看到这一幕正在发生...）',
    reviewPrompt: `你是一位温柔的心理老师，专门帮助小学生理解校园里的人际关系。
请根据下面的角色扮演记录，写一份温暖有趣的复盘报告。
要求：
1. 开头先肯定孩子的参与，用星星✨和鼓励的话语
2. 分析孩子选择扮演的角色，以及他在这个角色中的表现
3. 描述场景中小刚的反应和可能的后果
4. 给出1-2个"如果重来一次，还有什么别的选择"的建议
5. 最后说一句鼓励的话
6. 全程语气温暖，像朋友聊天，多用emoji
7. 不要超过250字。`,
    maxRounds: 4,
    createdBy: 'system',
    isDefault: true,
    createdAt: Date.now(),
  },
];

// 场景存储类
class ScenarioStorage {
  constructor() {
    this.scenarios = this.loadScenarios();
  }

  // 加载场景列表
  loadScenarios() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SCENARIOS);
      if (stored) {
        const parsed = JSON.parse(stored);
        // 合并默认场景和用户场景
        const userScenarios = parsed.filter(s => !s.isDefault);
        return [...DEFAULT_SCENARIOS, ...userScenarios];
      }
      return DEFAULT_SCENARIOS;
    } catch (e) {
      console.error('加载场景失败:', e);
      return DEFAULT_SCENARIOS;
    }
  }

  // 保存场景列表
  saveScenarios() {
    try {
      const userScenarios = this.scenarios.filter(s => !s.isDefault);
      localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(userScenarios));
    } catch (e) {
      console.error('保存场景失败:', e);
    }
  }

  // 获取所有场景
  getAll() {
    return this.scenarios;
  }

  // 获取用户场景（不包括默认）
  getUserScenarios() {
    return this.scenarios.filter(s => !s.isDefault);
  }

  // 获取默认场景
  getDefaultScenarios() {
    return this.scenarios.filter(s => s.isDefault);
  }

  // 根据ID获取场景
  getById(id) {
    return this.scenarios.find(s => s.id === id);
  }

  // 保存新场景
  save(scenario) {
    const newScenario = {
      ...scenario,
      id: scenario.id || `scenario_${Date.now()}`,
      isDefault: false,
      createdAt: Date.now(),
    };
    this.scenarios.push(newScenario);
    this.saveScenarios();
    return newScenario;
  }

  // 更新场景
  update(id, updates) {
    const index = this.scenarios.findIndex(s => s.id === id);
    if (index !== -1 && !this.scenarios[index].isDefault) {
      this.scenarios[index] = { ...this.scenarios[index], ...updates };
      this.saveScenarios();
      return this.scenarios[index];
    }
    return null;
  }

  // 删除场景
  delete(id) {
    const scenario = this.scenarios.find(s => s.id === id);
    if (scenario && !scenario.isDefault) {
      this.scenarios = this.scenarios.filter(s => s.id !== id);
      this.saveScenarios();
      return true;
    }
    return false;
  }
}

export const scenarioStorage = new ScenarioStorage();

// 用户故事存储
export function saveUserStory(story) {
  try {
    const stories = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_STORIES) || '[]');
    stories.unshift({
      id: `story_${Date.now()}`,
      content: story,
      createdAt: Date.now(),
    });
    localStorage.setItem(STORAGE_KEYS.USER_STORIES, JSON.stringify(stories.slice(0, 50))); // 最多保存50条
    return true;
  } catch (e) {
    console.error('保存用户故事失败:', e);
    return false;
  }
}

export function getUserStories() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_STORIES) || '[]');
  } catch (e) {
    return [];
  }
}
