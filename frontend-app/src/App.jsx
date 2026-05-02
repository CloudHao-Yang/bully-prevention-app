import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  HeartHandshake,
  Home,
  MessageCircle,
  PenLine,
  RefreshCcw,
  Send,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import { HOME_IMAGES } from './homeAssets';
import { generateScenarioFromStory } from './scenarioGenerator';
import { generatePracticeBeat } from './practiceGenerator';
import './App.css';

const VIEW = {
  HOME: 'home',
  SCENARIOS: 'scenarios',
  ROLE: 'role',
  PRACTICE: 'practice',
  REVIEW: 'review',
  STORY: 'story',
};

const DEFAULT_SCENARIOS = [
  {
    id: 'nickname',
    title: '被起外号',
    place: '教室课间',
    goal: '观察外号如何升级或降级',
    duration: '3 分钟',
    difficulty: '入门',
    tone: 'coral',
    summary: '同学反复用难听外号开玩笑，周围有人跟着笑。',
    opening: '课间，你刚走进教室，小刚故意提高声音喊出那个外号。几位同学看了过来。',
    prompt: '你现在最自然的反应是什么？',
    isDefault: true,
    createdBy: 'system',
    createdAt: 0,
  },
  {
    id: 'excluded',
    title: '被排挤',
    place: '操场分组',
    goal: '观察排挤中的关系变化',
    duration: '4 分钟',
    difficulty: '中等',
    tone: 'teal',
    summary: '游戏分组时，有人暗示大家不要选你。',
    opening: '体育课要分组，小雨拉着几个同学小声说：“别和他一组，会拖后腿。”',
    prompt: '你准备怎么处理这个局面？',
    isDefault: true,
    createdBy: 'system',
    createdAt: 0,
  },
  {
    id: 'groupchat',
    title: '群聊阴阳',
    place: '班级群聊',
    goal: '观察群聊里的扩散风险',
    duration: '4 分钟',
    difficulty: '进阶',
    tone: 'amber',
    summary: '群聊里有人用表情和暗号持续嘲笑同学。',
    opening: '晚上，班级群里突然刷起一排表情包，几句话没有点名，但大家都知道是在说小明。',
    prompt: '你会在群里怎么说，或者先做什么？',
    isDefault: true,
    createdBy: 'system',
    createdAt: 0,
  },
];

const roles = [
  {
    id: 'target',
    title: '被针对者',
    name: '小明',
    icon: Shield,
    color: '#d86f61',
    skill: '亲历局面',
    description: '从被针对的位置，看见每种反应会把局势推向哪里。',
  },
  {
    id: 'friend',
    title: '朋友',
    name: '小亮',
    icon: HeartHandshake,
    color: '#238b83',
    skill: '影响局势',
    description: '从朋友的位置，观察介入、沉默或求助带来的变化。',
  },
  {
    id: 'observer',
    title: '旁观者',
    name: '观察者',
    icon: Users,
    color: '#8a6fb0',
    skill: '旁观推演',
    description: '从旁观位置，看见围观、离开或提醒别人会怎样改变现场。',
  },
  {
    id: 'follower',
    title: '跟风者',
    name: '小强',
    icon: MessageCircle,
    color: '#c18a1c',
    skill: '施压视角',
    description: '从起哄的位置，推演一句玩笑如何影响别人和关系。',
  },
];

const quickReplies = [
  '别这样叫我，我不喜欢。',
  '你再叫我，我也给你起外号。',
  '我不想理他，先坐回座位。',
  '我先去找老师说一下这件事。',
];

const simulationBeats = {
  assertive: {
    npc: '小刚撇了撇嘴：“哎呀，开个玩笑而已，这么认真干嘛？”',
    note: '你把“不喜欢”说出来后，现场从模糊玩笑变成了明确冲突。对方没有立刻停，但周围人开始注意你的态度。',
    nextTip: '如果继续坚持，局势可能降级；如果对方继续试探，可能需要第三方介入。',
    feedback: {
      risk: { label: '小幅下降', level: 48 },
      pressure: { label: '仍有压力', level: 62 },
      support: { label: '可出现', level: 58 },
      control: { label: '提高', level: 72 },
    },
  },
  counter: {
    npc: '小刚愣了一下，马上提高声音：“哟，你还急了？大家听见没！”',
    note: '反击让对方短暂停顿，但也给围观者新的起哄点，现场注意力更集中到你身上。',
    nextTip: '继续对骂可能让风险升高；换成离开、找人或冷处理，局势会走向不同分支。',
    feedback: {
      risk: { label: '升高', level: 74 },
      pressure: { label: '上升', level: 80 },
      support: { label: '不稳定', level: 36 },
      control: { label: '摇摆', level: 46 },
    },
  },
  silent: {
    npc: '小刚看你没说话，又对旁边同学笑了一下：“你看，他默认了。”',
    note: '沉默让你暂时避开正面冲突，但对方可能把沉默理解成可以继续。',
    nextTip: '如果你暂时不想回应，可以观察谁在旁边、什么时候离开、之后找谁说明。',
    feedback: {
      risk: { label: '缓慢升高', level: 66 },
      pressure: { label: '压住了', level: 72 },
      support: { label: '未出现', level: 28 },
      control: { label: '降低', level: 32 },
    },
  },
  help: {
    npc: '小刚小声嘀咕：“又告老师。”旁边几个同学的笑声停了一下。',
    note: '求助把现场从同伴之间的玩笑拉到了成人可能介入的范围，短期会带来同伴压力，也增加保护机会。',
    nextTip: '后续关键是说清楚发生了什么，而不是只说“他欺负我”。',
    feedback: {
      risk: { label: '有波动', level: 54 },
      pressure: { label: '短期上升', level: 68 },
      support: { label: '明显增加', level: 82 },
      control: { label: '转移', level: 64 },
    },
  },
};

const fallbackFeedback = {
  risk: { label: '观察中', level: 50 },
  pressure: { label: '需要照顾', level: 58 },
  support: { label: '可寻找', level: 45 },
  control: { label: '未变化', level: 50 },
};

const fallbackTip = '先按你最自然的反应说一句，系统会继续推演现场会怎样变化。';

const USER_SCENARIO_STORAGE_KEY = 'bully_user_scenarios_v2';

function loadUserScenarios() {
  try {
    const stored = localStorage.getItem(USER_SCENARIO_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === 'object' && item.id && !item.isDefault);
  } catch (error) {
    return [];
  }
}

function saveUserScenarios(scenarios) {
  try {
    const userOnly = scenarios.filter((scenario) => scenario && !scenario.isDefault);
    localStorage.setItem(USER_SCENARIO_STORAGE_KEY, JSON.stringify(userOnly));
  } catch (error) {
  }
}

function getScenarioOpening(scenario, role) {
  if (scenario?.openings && role?.id && scenario.openings[role.id]) return scenario.openings[role.id];
  return scenario?.opening || '';
}

export default function App() {
  const [view, setView] = useState(VIEW.HOME);
  const [scenarioList, setScenarioList] = useState(() => {
    const userScenarios = loadUserScenarios();
    const merged = [...DEFAULT_SCENARIOS, ...userScenarios];
    const seen = new Set();
    return merged.filter((scenario) => {
      if (!scenario?.id) return false;
      if (seen.has(scenario.id)) return false;
      seen.add(scenario.id);
      return true;
    });
  });
  const [selectedScenario, setSelectedScenario] = useState(DEFAULT_SCENARIOS[0]);
  const [selectedRole, setSelectedRole] = useState(roles[0]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [round, setRound] = useState(0);
  const [currentFeedback, setCurrentFeedback] = useState(fallbackFeedback);
  const [lastNote, setLastNote] = useState(fallbackTip);
  const [nextTip, setNextTip] = useState('局势还没有展开。');
  const [storyDraft, setStoryDraft] = useState('');
  const [isScenarioGenerating, setIsScenarioGenerating] = useState(false);
  const [storyError, setStoryError] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const reviewTimerRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [view]);

  useEffect(() => {
    if (!scenarioList.length) {
      setScenarioList(DEFAULT_SCENARIOS);
      setSelectedScenario(DEFAULT_SCENARIOS[0]);
      return;
    }

    setSelectedScenario((current) => {
      const found = scenarioList.find((scenario) => scenario.id === current?.id);
      return found || scenarioList[0];
    });
  }, [scenarioList]);

  const abilityScores = useMemo(() => {
    const boost = Math.min(round, 3) * 5;
    return [
      { label: '局势风险', value: currentFeedback.risk.level, text: '这表示现场继续升级的可能性' },
      { label: '情绪压力', value: currentFeedback.pressure.level, text: '这表示你在现场承受的心理压力' },
      { label: '支持机会', value: currentFeedback.support.level, text: '这表示同伴、老师或家长介入的机会' },
      { label: '掌控感', value: currentFeedback.control.level + boost, text: '这表示你对下一步选择的可控程度' },
    ];
  }, [currentFeedback, round]);

  function chooseScenario(scenario) {
    setSelectedScenario(scenario);
    setView(VIEW.ROLE);
  }

  function startPractice(role = selectedRole, scenario = selectedScenario) {
    if (reviewTimerRef.current) {
      window.clearTimeout(reviewTimerRef.current);
      reviewTimerRef.current = null;
    }
    setSelectedScenario(scenario);
    setSelectedRole(role);
    const opening = getScenarioOpening(scenario, role);
    setMessages([
      {
        id: 'scene',
        type: 'scene',
        text: opening,
      },
    ]);
    setRound(0);
    setCurrentFeedback(fallbackFeedback);
    setLastNote(fallbackTip);
    setNextTip('局势还没有展开。');
    setInput('');
    setView(VIEW.PRACTICE);
  }

  async function sendMessage(text = input) {
    const clean = text.trim();
    if (!clean || isAiThinking || round >= 3) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      speaker: selectedRole.name,
      text: clean,
    };

    setMessages((items) => [...items, userMessage]);
    setInput('');
    setIsAiThinking(true);

    let nextBeat;
    try {
      nextBeat = await generatePracticeBeat({
        scenario: selectedScenario,
        role: selectedRole,
        history: [...messages, userMessage],
        round,
      });
    } catch (error) {
      nextBeat = getSimulationBeat(clean);
    }

    const nextRound = round + 1;

    setMessages((items) => [
      ...items,
      {
        id: `npc-${Date.now()}`,
        type: 'npc',
        speaker: '情境回应',
        text: nextBeat.npc,
      },
    ]);
    setRound(nextRound);
    setCurrentFeedback(nextBeat.feedback || fallbackFeedback);
    setLastNote(nextBeat.note || fallbackTip);
    setNextTip(nextBeat.nextTip || '局势还没有展开。');
    setIsAiThinking(false);

    if (nextRound >= 3) {
      reviewTimerRef.current = window.setTimeout(() => {
        reviewTimerRef.current = null;
        setView(VIEW.REVIEW);
      }, 650);
    }
  }

  function resetToHome() {
    if (reviewTimerRef.current) {
      window.clearTimeout(reviewTimerRef.current);
      reviewTimerRef.current = null;
    }
    setView(VIEW.HOME);
    setSelectedScenario(scenarioList[0] || DEFAULT_SCENARIOS[0]);
    setSelectedRole(roles[0]);
    setMessages([]);
    setRound(0);
    setCurrentFeedback(fallbackFeedback);
    setLastNote(fallbackTip);
    setNextTip('局势还没有展开。');
    setInput('');
    setIsAiThinking(false);
    setStoryError('');
  }

  return (
    <main className="app-shell">
      {view === VIEW.HOME && (
        <HomeView
          scenario={scenarioList[0] || DEFAULT_SCENARIOS[0]}
          onStart={() => startPractice(roles[0], scenarioList[0] || DEFAULT_SCENARIOS[0])}
          onExplore={() => setView(VIEW.SCENARIOS)}
          onStory={() => setView(VIEW.STORY)}
        />
      )}

      {view === VIEW.SCENARIOS && (
        <ScenarioView
          selectedScenario={selectedScenario}
          onBack={() => setView(VIEW.HOME)}
          onChoose={chooseScenario}
          scenarios={scenarioList}
        />
      )}

      {view === VIEW.ROLE && (
        <RoleView
          scenario={selectedScenario}
          selectedRole={selectedRole}
          onBack={() => setView(VIEW.SCENARIOS)}
          onChoose={(role) => {
            setSelectedRole(role);
            startPractice(role);
          }}
        />
      )}

      {view === VIEW.PRACTICE && (
        <PracticeView
          scenario={selectedScenario}
          role={selectedRole}
          messages={messages}
          input={input}
          round={round}
          feedback={currentFeedback}
          note={lastNote}
          nextTip={nextTip}
          onInput={setInput}
          onSend={sendMessage}
          onBack={() => setView(VIEW.ROLE)}
          onHome={resetToHome}
          onEnd={() => setView(VIEW.REVIEW)}
          loading={isAiThinking}
        />
      )}

      {view === VIEW.REVIEW && (
        <ReviewView
          scenario={selectedScenario}
          role={selectedRole}
          scores={abilityScores}
          onReplay={() => startPractice(selectedRole)}
          onHome={resetToHome}
        />
      )}

      {view === VIEW.STORY && (
        <StoryView
          value={storyDraft}
          onChange={setStoryDraft}
          onBack={() => setView(VIEW.HOME)}
          onDemo={() => {
            setSelectedScenario(scenarioList[0] || DEFAULT_SCENARIOS[0]);
            setView(VIEW.ROLE);
          }}
          onGenerate={async () => {
            if (!storyDraft.trim() || isScenarioGenerating) return;
            setStoryError('');
            setIsScenarioGenerating(true);
            try {
              const scenarioData = await generateScenarioFromStory(storyDraft);
              const createdAt = Date.now();
              const newScenario = {
                id: `story_${createdAt}`,
                title: scenarioData.title || '我的故事',
                place: '你的故事',
                goal: '观察选择后的走向',
                duration: '4 分钟',
                difficulty: scenarioData.difficulty || '中等',
                tone: 'teal',
                summary: scenarioData.description || '根据你的故事生成的情境。',
                prompt: '你现在最自然的反应是什么？',
                openings: {
                  target: scenarioData.victimScene || scenarioData.victimNarrator || '故事正在发生...',
                  friend: scenarioData.bystanderScene || scenarioData.bystanderNarrator || '你看到了这一幕...',
                  follower: scenarioData.accompliceScene || scenarioData.accompliceNarrator || '你在旁边跟着起哄...',
                  observer: scenarioData.observerScene || scenarioData.observerNarrator || '你静静地看着这一切...',
                },
                aiScenario: scenarioData,
                isDefault: false,
                createdBy: 'user',
                createdAt,
              };

              setScenarioList((items) => {
                const next = [newScenario, ...items.filter((item) => item.id !== newScenario.id)];
                saveUserScenarios(next);
                return next;
              });
              setSelectedScenario(newScenario);
              setSelectedRole(roles[0]);
              setView(VIEW.ROLE);
            } catch (error) {
              setStoryError(error?.message || '生成失败，请重试');
            } finally {
              setIsScenarioGenerating(false);
            }
          }}
          loading={isScenarioGenerating}
          error={storyError}
        />
      )}
    </main>
  );
}

function HomeView({ scenario, onStart, onExplore, onStory }) {
  const actions = [
    {
      label: '我来回应',
      hint: '直接进入第一轮推演',
      icon: MessageCircle,
      onClick: onStart,
      accent: 'dark',
    },
    {
      label: '换一个场景',
      hint: '切换教室、操场或群聊',
      icon: BookOpen,
      onClick: onExplore,
      accent: 'light',
    },
    {
      label: '讲述我的故事',
      hint: '把真实经历转成剧本',
      icon: PenLine,
      onClick: onStory,
      accent: 'light',
    },
  ];

  return (
    <section className="home-screen page">
      <div className="theater-panel" aria-label="校园情境预演">
        <img src={HOME_IMAGES.hero.url} alt={HOME_IMAGES.hero.alt} />
        <div className="theater-overlay">
          <div className="theater-topline">
            <span>{scenario.place}</span>
            <strong>{scenario.title}</strong>
          </div>
          <div className="stage-dialogues">
            <div className="stage-bubble bully">小刚：哟，四眼田鸡来了。</div>
            <div className="stage-bubble crowd">同学A：哈哈，他又来了。</div>
            <div className="stage-bubble silent">小明：……</div>
            <div className="stage-cta-wrap">
              <button type="button" className="stage-question" onClick={onStart}>
                <span>这只是玩笑吗？你会怎么回应？</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="home-copy">
        <div className="eyebrow">校园冲突情景推演</div>
        <h1>别想欺负我</h1>
        <p className="lead">
          事情已经发生了。进入这个小剧场，看看你的自然反应会把局势推向哪里。
        </p>
        <div className="action-grid">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                className={`action-card ${action.accent}`}
                onClick={action.onClick}
              >
                <span className="action-icon">
                  <Icon size={22} />
                </span>
                <strong>{action.label}</strong>
                <span>{action.hint}</span>
              </button>
            );
          })}
        </div>
        <div className="journey-card">
          <div className="journey-step"><span className="step-icon"><BookOpen size={18} /></span><span>看见场景</span></div>
          <ChevronRight size={16} className="step-arrow" />
          <div className="journey-step"><span className="step-icon"><Users size={18} /></span><span>进入角色</span></div>
          <ChevronRight size={16} className="step-arrow" />
          <div className="journey-step"><span className="step-icon"><ClipboardList size={18} /></span><span>看局势</span></div>
          <ChevronRight size={16} className="step-arrow" />
          <div className="journey-step"><span className="step-icon"><CheckCircle2 size={18} /></span><span>回放后果</span></div>
        </div>
      </div>
    </section>
  );
}

function ScenarioView({ scenarios, selectedScenario, onBack, onChoose }) {
  return (
    <section className="page narrow-page">
      <TopBar title="选择今天要练习的情境" onBack={onBack} />
      <div className="section-intro">
        <p>先从一个高频校园场景开始。重点不是选标准答案，而是观察选择后的真实走向。</p>
      </div>
      <div className="scenario-grid">
        {scenarios.map((scenario) => (
          <button
            className={`scenario-card ${scenario.tone} ${selectedScenario.id === scenario.id ? 'selected' : ''}`}
            key={scenario.id}
            onClick={() => onChoose(scenario)}
          >
            <div className="scenario-card-top">
              <span>{scenario.place}</span>
              <span>{scenario.difficulty}</span>
            </div>
            <h2>{scenario.title}</h2>
            <p>{scenario.summary}</p>
            <div className="scenario-meta">
              <span>{scenario.goal}</span>
              <span>{scenario.duration}</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function RoleView({ scenario, selectedRole, onBack, onChoose }) {
  return (
    <section className="page narrow-page">
      <TopBar title="选择你的练习视角" onBack={onBack} />
      <div className="context-card">
        <span>{scenario.title}</span>
        <p>{scenario.summary}</p>
      </div>
      <div className="role-list">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <button
              className={`role-card ${selectedRole.id === role.id ? 'selected' : ''}`}
              key={role.id}
              onClick={() => onChoose(role)}
              style={{ '--role-color': role.color }}
            >
              <span className="role-icon"><Icon size={22} /></span>
              <span className="role-content">
                <strong>{role.title}</strong>
                <em>{role.skill}</em>
                <p>{role.description}</p>
              </span>
              <ChevronRight size={18} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PracticeView({
  scenario,
  role,
  messages,
  input,
  round,
  feedback,
  note,
  nextTip,
  onInput,
  onSend,
  onBack,
  onHome,
  onEnd,
  loading,
}) {
  return (
    <section className="practice-screen">
      <header className="practice-header">
        <button className="icon-btn" onClick={onBack} aria-label="返回">
          <ArrowLeft size={20} />
        </button>
        <div>
          <strong>{scenario.title}</strong>
          <span>{role.title} · 第 {Math.min(round + 1, 3)} 轮</span>
        </div>
        <button className="icon-btn home-shortcut" onClick={onHome} aria-label="回到首页">
          <Home size={19} />
        </button>
        <button className="text-btn end-review-btn" onClick={onEnd}>查看回放</button>
      </header>

      <div className="practice-body">
        <div className="chat-column">
          <div className="scene-banner">
            <Sparkles size={18} />
            <span>{scenario.prompt}</span>
          </div>

          <div className="message-list">
            {messages.map((message) => (
              <div className={`message-row ${message.type}`} key={message.id}>
                {message.type !== 'scene' && <span className="avatar">{message.type === 'user' ? role.name.slice(0, 1) : '情'}</span>}
                <div className="bubble">
                  {message.speaker && <span className="speaker">{message.speaker}</span>}
                  {message.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="message-row npc" key="loading">
                <span className="avatar">情</span>
                <div className="bubble">
                  <span className="speaker">情境回应</span>
                  正在推演...
                </div>
              </div>
            )}
          </div>

          <div className="reply-suggestions">
            {quickReplies.map((reply) => (
              <button key={reply} onClick={() => onSend(reply)} disabled={round >= 3 || loading}>
                {reply}
              </button>
            ))}
          </div>

          <div className="composer">
            <input
              value={input}
              onChange={(event) => onInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSend();
              }}
              placeholder={`以“${role.name}”的身份说一句...`}
              disabled={round >= 3 || loading}
            />
            <button className="send-btn" onClick={() => onSend()} disabled={!input.trim() || round >= 3 || loading}>
              <Send size={18} />
            </button>
          </div>
        </div>

        <aside className="feedback-panel">
          <div className="panel-title">
            <ClipboardList size={20} />
            局势变化
          </div>
          <p>{note}</p>
          <FeedbackMeter label="局势风险" item={feedback.risk} inverse />
          <FeedbackMeter label="情绪压力" item={feedback.pressure} inverse />
          <FeedbackMeter label="支持机会" item={feedback.support} />
          <FeedbackMeter label="掌控感" item={feedback.control} />
          <div className="next-tip">
            <strong>下一种可能</strong>
            <span>{nextTip}</span>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ReviewView({ scenario, role, scores, onReplay, onHome }) {
  return (
    <section className="page narrow-page">
      <div className="review-hero">
        <div className="review-icon"><CheckCircle2 size={32} /></div>
        <span>推演回放</span>
        <h1>{scenario.title} · {role.title}</h1>
        <p>这不是评价对错，而是把刚才的选择、现场反应和后续可能性摊开来看。</p>
      </div>

      <div className="score-grid">
        {scores.map((score) => (
          <div className="score-card" key={score.label}>
            <div className="score-head">
              <strong>{score.label}</strong>
              <span>{score.value}</span>
            </div>
            <div className="score-track">
              <i style={{ width: `${Math.min(score.value, 100)}%` }} />
            </div>
            <p>{score.text}</p>
          </div>
        ))}
      </div>

      <div className="review-sections">
        <ReviewBlock title="你刚才选择了什么" text="你用自己的方式回应了外号。这个选择会影响对方是否继续试探，也会影响围观同学怎么看待现场。" />
        <ReviewBlock title="现场发生了什么变化" text="每一种反应都会改变注意力、压力和支持机会。沉默、反击、求助、表达不喜欢，都可能把局势推向不同方向。" />
        <ReviewBlock title="如果继续推演" text="下一步可以继续试：对方加重起哄时怎么办、朋友介入时怎么办、老师出现后怎么说清楚发生了什么。" />
      </div>

      <div className="bottom-actions">
        <button className="primary-btn" onClick={onReplay}>
          <RefreshCcw size={18} />
          再练一次
        </button>
        <button className="secondary-btn" onClick={onHome}>
          <Home size={18} />
          回到首页
        </button>
      </div>
    </section>
  );
}

function StoryView({ value, onChange, onBack, onDemo, onGenerate, loading, error }) {
  return (
    <section className="page narrow-page">
      <TopBar title="讲述我的故事" onBack={onBack} />
      <div className="story-layout">
        <img src={HOME_IMAGES.storyInput.url} alt={HOME_IMAGES.storyInput.alt} />
        <div className="story-card">
          <h2>先保留这个入口，后面再接 AI 生成</h2>
          <p>这里未来会把孩子描述的真实经历转成一个可推演的剧本，而不是生成一段固定故事。</p>
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="可以简单写下：发生在哪里、谁说了什么、你当时有什么感受。"
          />
          {error && <p>{error}</p>}
          <button className="primary-btn" onClick={onGenerate} disabled={loading || !value.trim()}>
            {loading ? '正在生成剧本...' : '生成剧本并开始'}
            <ChevronRight size={18} />
          </button>
          <button className="primary-btn" onClick={onDemo}>
            先体验预设演练
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}

function getSimulationBeat(text) {
  if (/骂|打|揍|还回去|起外号|你才|反击|报复/.test(text)) {
    return simulationBeats.counter;
  }

  if (/老师|家长|告诉|求助|主任|辅导员/.test(text)) {
    return simulationBeats.help;
  }

  if (/不理|沉默|走开|离开|回座位|不说话|忍/.test(text)) {
    return simulationBeats.silent;
  }

  if (/不喜欢|别|停止|不要|不舒服|请/.test(text)) {
    return simulationBeats.assertive;
  }

  return {
    npc: '小刚看了看你的反应，又试探着说了一句：“你到底想怎样？”',
    note: '你的回应让现场进入新的不确定状态。对方还在观察你会不会继续、旁边人会不会加入。',
    nextTip: '如果你继续回应，局势会更清楚；如果你停下来，现场可能暂时悬着。',
    feedback: {
      risk: { label: '不确定', level: 58 },
      pressure: { label: '维持', level: 60 },
      support: { label: '未明朗', level: 42 },
      control: { label: '摇摆', level: 48 },
    },
  };
}

function FeedbackMeter({ label, item, inverse = false }) {
  const colorClass = inverse && item.level < 45 ? 'good' : item.level > 70 ? 'strong' : 'steady';

  return (
    <div className="meter">
      <div className="meter-head">
        <span>{label}</span>
        <strong className={colorClass}>{item.label}</strong>
      </div>
      <div className="meter-track">
        <i className={colorClass} style={{ width: `${item.level}%` }} />
      </div>
    </div>
  );
}

function ReviewBlock({ title, text }) {
  return (
    <article className="review-block">
      <h2>{title}</h2>
      <p>{text}</p>
    </article>
  );
}

function TopBar({ title, onBack }) {
  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onBack} aria-label="返回">
        <ArrowLeft size={20} />
      </button>
      <h1>{title}</h1>
      <span />
    </header>
  );
}
