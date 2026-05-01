import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, User, Bot, RotateCcw, Star, Heart, Sparkles, 
  ChevronRight, Home, Edit3, BookOpen, Plus, Trash2,
  ArrowLeft, Save, Wand2, Settings, Eye, Copy, ChevronDown,
  Play, Zap, ShieldCheck, HandHeart, MessageCircle, Users
} from 'lucide-react';
import { chatWithMiniMax } from './api';
import { scenarioStorage, saveUserStory, setNotification, getNotification, clearNotification } from './storage';
import { generateScenarioFromStory, generateScenarioSummary } from './scenarioGenerator';

const ENCOURAGEMENT_MESSAGES = [
  '太棒了！💪', '你做得很好！✨', '继续加油！🌟', '你的选择很有勇气！💖', '真了不起！🏆',
];

// ===== 视图类型 =====
const VIEW = {
  HOME: 'home',
  STORY_INPUT: 'story-input',
  SCENARIO_LIBRARY: 'scenario-library',
  SCENARIO_EDITOR: 'scenario-editor',
  SCENARIO_PREVIEW: 'scenario-preview',
  ROLE_SELECT: 'role-select',
  CHAT: 'chat',
  REVIEW_LOADING: 'review-loading',
  REVIEW: 'review',
};

// ===== 复用组件 =====
function Confetti() {
  return (
    <div style={styles.confettiContainer}>
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          style={{
            ...styles.confettiPiece,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 0.5}s`,
            backgroundColor: ['#FFB366', '#E8A0A0', '#7ECEC1', '#F5D98A', '#B8A9D4'][Math.floor(Math.random() * 5)],
          }}
        />
      ))}
    </div>
  );
}

function TypingIndicator({ color }) {
  return (
    <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
      <div style={{ ...styles.npcAvatar, backgroundColor: color || '#FFB366' }}>
        <Bot size={16} color="#fff" />
      </div>
      <div style={styles.typingBubble}>
        <span style={{ ...styles.typingDot, animationDelay: '0s' }}>●</span>
        <span style={{ ...styles.typingDot, animationDelay: '0.2s' }}>●</span>
        <span style={{ ...styles.typingDot, animationDelay: '0.4s' }}>●</span>
      </div>
    </div>
  );
}

function ProgressStars({ current, total, color }) {
  return (
    <div style={styles.progressStars}>
      {[...Array(total)].map((_, i) => (
        <Star key={i} size={20} fill={i < current ? color : '#E5E5EA'} color={i < current ? color : '#E5E5EA'} />
      ))}
    </div>
  );
}

function Button({ children, onClick, variant = 'primary', size = 'medium', icon, disabled, style }) {
  const baseStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 16, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    opacity: disabled ? 0.6 : 1,
    ...(size === 'large' && { padding: '18px 32px', fontSize: 18 }),
    ...(size === 'medium' && { padding: '14px 24px', fontSize: 16 }),
    ...(size === 'small' && { padding: '10px 18px', fontSize: 14 }),
    ...(variant === 'primary' && { backgroundColor: '#FFB366', color: '#fff', border: 'none' }),
    ...(variant === 'secondary' && { backgroundColor: '#fff', color: '#333', border: '2px solid #E5E5EA' }),
    ...(variant === 'ghost' && { backgroundColor: 'transparent', color: '#666', border: 'none' }),
    ...style,
  };
  return (
    <button style={baseStyle} onClick={onClick} disabled={disabled}>
      {icon} {children}
    </button>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div 
      style={{ 
        backgroundColor: '#fff', borderRadius: 20, padding: 24,
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)', 
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        ...style 
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ===== 主组件 =====
export default function App() {
  const [view, setView] = useState(VIEW.HOME);
  const [currentScenario, setCurrentScenario] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [round, setRound] = useState(0);
  const [reviewContent, setReviewContent] = useState('');
  const [npcReplies, setNpcReplies] = useState([]);
  const [victimReaction, setVictimReaction] = useState('');
  const [apiError, setApiError] = useState('');
  const [showEncouragement, setShowEncouragement] = useState(false);
  
  // 通知状态（从 localStorage 读取）
  const [notification, setNotification] = useState(() => getNotification());
  
  // 清除通知
  const dismissNotification = () => {
    setNotification(null);
    clearNotification();
  };
  
  // 5秒后自动清除通知
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(dismissNotification, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  
  const messagesEndRef = useRef(null);
  const MAX_ROUNDS = 4;

  const config = currentScenario ? getCharacterConfig(currentScenario, selectedRoleId) : {};
  const roleColor = config.color || '#B8A9D4';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, npcReplies, victimReaction]);

  // 显示通知（保存到 localStorage）
  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // 后台生成剧本
  const generateInBackground = (story) => {
    // 保存故事
    saveUserStory(story);
    
    // 显示正在生成通知
    setNotification({ type: 'info', message: '✨ 剧本正在后台生成中...' });
    
    // 开始生成
    generateScenarioFromStory(story)
      .then((scenario) => {
        // 保存到场景库
        scenarioStorage.save(scenario);
        // 显示完成通知
        setNotification({ type: 'success', message: '🎉 剧本生成完成，已保存到场景库！' });
      })
      .catch((e) => {
        console.error('生成剧本失败:', e);
        // 显示失败通知
        setNotification({ type: 'info', message: '😅 剧本生成遇到问题，请重试' });
      });
  };

  // 获取角色配置
  function getCharacterConfig(scenario, roleId) {
    if (!scenario) return {};
    
    const roleMap = {
      victim: { ...scenario.characters?.find(c => c.id === 'victim'), narrator: scenario.victimNarrator, scene: scenario.victimScene, userIs: scenario.characters?.find(c => c.id === 'victim')?.name || '小明' },
      bystander: { ...scenario.characters?.find(c => c.id === 'bully'), narrator: scenario.bystanderNarrator, scene: scenario.bystanderScene, userIs: '小亮' },
      accomplice: { ...scenario.characters?.find(c => c.id === 'bully'), narrator: scenario.accompliceNarrator, scene: scenario.accompliceScene, userIs: '小强' },
      observer: { ...scenario.characters?.find(c => c.id === 'bully'), narrator: scenario.observerNarrator, scene: scenario.observerScene, userIs: '观察者' },
    };
    
    return roleMap[roleId] || {};
  }

  // 开始角色扮演
  const startPractice = (scenario, roleId) => {
    setCurrentScenario(scenario);
    setSelectedRoleId(roleId);
    const charConfig = getCharacterConfig(scenario, roleId);
    setMessages([
      { id: 1, role: 'narrator', content: charConfig.narrator || '' },
      { id: 2, role: 'scene', content: charConfig.scene || '' },
    ]);
    setNpcReplies([]);
    setVictimReaction('');
    setRound(0);
    setView(VIEW.CHAT);
  };

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg = { id: Date.now(), role: 'user', content: inputValue.trim(), character: config.userIs };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);
    setNpcReplies([]);
    setVictimReaction('');
    setApiError('');
    setShowEncouragement(false);

    try {
      const historyText = newMessages
        .filter(m => m.role !== 'scene' && m.role !== 'narrator')
        .map(m => `${m.character}：${m.content}`)
        .join('\n');

      const bullyReply = await chatWithMiniMax(
        [{ role: 'user', content: `对话历史：\n${historyText}\n\n请以小刚的身份回应。` }],
        currentScenario.characters?.find(c => c.id === 'bully')?.systemPrompt || BULLY_PROMPT
      );

      const victimReact = await chatWithMiniMax(
        [{ role: 'user', content: `小刚刚说了：${bullyReply}\n\n请描述小明的反应。` }],
        VICTIM_SILENT_PROMPT
      );

      setNpcReplies([{ id: Date.now() + 1, character: '小刚', text: bullyReply?.trim() || '...' }]);
      setVictimReaction(victimReact?.trim() || '');

      const nextRound = round + 1;
      setRound(nextRound);
      setShowEncouragement(true);
      setTimeout(() => setShowEncouragement(false), 2000);

      if (nextRound >= (currentScenario.maxRounds || MAX_ROUNDS)) {
        setTimeout(() => generateReview(newMessages), 2500);
      }
    } catch (error) {
      setApiError('网络好像有点累了，休息一下再试吧 💪');
    } finally {
      setIsLoading(false);
    }
  };

  // 生成复盘
  const generateReview = async (chatMessages) => {
    setView(VIEW.REVIEW_LOADING);
    const historyText = chatMessages
      .filter(m => m.role !== 'scene' && m.role !== 'narrator')
      .map(m => `${m.character}：${m.content}`)
      .join('\n');

    try {
      const review = await chatWithMiniMax(
        [{ role: 'user', content: `角色扮演记录：\n${historyText}\n\n请写一份温暖有趣的复盘报告。` }],
        currentScenario?.reviewPrompt || REVIEW_SYSTEM_PROMPT
      );
      setReviewContent(review || '你完成了一次很棒的演练！继续加油！✨');
    } catch {
      setReviewContent('你完成了一次很棒的演练！继续加油！✨');
    } finally {
      setView(VIEW.REVIEW);
    }
  };

  const replay = () => { if (currentScenario && selectedRoleId) startPractice(currentScenario, selectedRoleId); };
  const goHome = () => {
    setView(VIEW.HOME);
    setCurrentScenario(null);
    setSelectedRoleId(null);
  };

  // ===== 视图一：首页 =====
  if (view === VIEW.HOME) {
    return <HomeView setView={setView} setCurrentScenario={setCurrentScenario} />;
  }

  // ===== 视图二：讲述故事 =====
  if (view === VIEW.STORY_INPUT) {
    return <StoryInputView setView={setView} onScenarioGenerated={(s) => setCurrentScenario(s)} generateInBackground={generateInBackground} />;
  }

  // ===== 视图三：场景库 =====
  if (view === VIEW.SCENARIO_LIBRARY) {
    return (
      <ScenarioLibraryView
        setView={setView}
        onSelectScenario={(s) => { setCurrentScenario(s); setView(VIEW.ROLE_SELECT); }}
        onEditScenario={(s) => { setCurrentScenario(s); setView(VIEW.SCENARIO_EDITOR); }}
      />
    );
  }

  // ===== 视图四：场景编辑器 =====
  if (view === VIEW.SCENARIO_EDITOR) {
    return <ScenarioEditorView setView={setView} scenario={currentScenario} onSave={(s) => { setCurrentScenario(s); setView(VIEW.ROLE_SELECT); }} />;
  }

  // ===== 视图五：场景预览 =====
  if (view === VIEW.SCENARIO_PREVIEW) {
    return <ScenarioPreviewView setView={setView} scenario={currentScenario} onEdit={() => setView(VIEW.SCENARIO_EDITOR)} onStart={(roleId) => startPractice(currentScenario, roleId)} />;
  }

  // ===== 视图六：角色选择 =====
  if (view === VIEW.ROLE_SELECT) {
    return (
      <div style={styles.selectContainer}>
        <style>{`@keyframes floatIn { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }`}</style>
        
        <div style={styles.selectHeader}>
          <button style={{ ...styles.backBtn, marginBottom: 16 }} onClick={goHome}>
            <ArrowLeft size={20} /> 返回首页
          </button>
          <div style={styles.logoContainer}><Sparkles size={40} color="#FFB366" /></div>
          <h1 style={styles.selectTitle}>{currentScenario?.title || '选择你的角色'}</h1>
          <p style={styles.selectSubtitle}>🌈 每个角色都会带你看到不同的故事</p>
        </div>
        
        <div style={styles.roleGrid}>
          {[
            { id: 'victim', emoji: '🛡️', title: '被针对的同学', subtitle: currentScenario?.characters?.find(c => c.id === 'victim')?.name || '小明', description: '经历被欺负的感受，练习如何回应' },
            { id: 'bystander', emoji: '💚', title: '关心同学的朋友', subtitle: '小亮', description: '作为旁观者，练习如何帮助和支持' },
            { id: 'accomplice', emoji: '⚡', title: '跟着起哄的同学', subtitle: '小强', description: '体验跟风者的心理，理解旁观者效应' },
            { id: 'observer', emoji: '👁️', title: '静静观察的你', subtitle: '观察者', description: '客观看待整个事件，理解欺凌的完整链条' },
          ].map((role, i) => (
            <button
              key={role.id}
              onClick={() => startPractice(currentScenario, role.id)}
              style={{
                ...styles.roleCard,
                background: `linear-gradient(135deg, #FFF${i * 3}FF 0%, #FFE${i * 3}E4 100%)`,
                borderColor: ['#E8A0A0', '#7ECEC1', '#F5D98A', '#B8A9D4'][i],
                animation: `floatIn 0.5s ease-out ${i * 0.12}s both`,
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>{role.emoji}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: ['#E8A0A0', '#7ECEC1', '#F5D98A', '#B8A9D4'][i], margin: '0 0 4px 0' }}>{role.title}</h3>
              <p style={{ fontSize: 14, color: '#888', margin: '0 0 8px 0' }}>{role.subtitle}</p>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, margin: 0 }}>{role.description}</p>
              <div style={{ marginTop: 16, color: ['#E8A0A0', '#7ECEC1', '#F5D98A', '#B8A9D4'][i], fontSize: 14, fontWeight: 600 }}>点击开始 <ChevronRight size={16} /></div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ===== 视图七：聊天演练 =====
  if (view === VIEW.CHAT) {
    return (
      <div style={styles.container}>
        <div style={styles.chatHeader}>
          <div style={styles.chatHeaderLeft}>
            <button style={styles.backBtnSmall} onClick={() => setView(VIEW.ROLE_SELECT)}><ArrowLeft size={18} /></button>
            <div style={{ ...styles.roleTag, backgroundColor: roleColor }}>{config.userIs}</div>
            <ProgressStars current={round} total={currentScenario?.maxRounds || MAX_ROUNDS} color={roleColor} />
          </div>
          <button style={{ ...styles.endButton, color: roleColor }} onClick={() => generateReview(messages)}>结束演练</button>
        </div>

        <div style={styles.chatBox}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ ...styles.messageRow, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'narrator' && <div style={styles.narratorBubble}><Sparkles size={14} color="#B8A9D4" style={{ marginRight: 6 }} />{msg.content}</div>}
              {msg.role === 'scene' && <div style={{ ...styles.sceneBubble, borderColor: `${roleColor}40` }}>{msg.content}</div>}
              {msg.role === 'user' && (
                <>
                  <div style={{ ...styles.avatarUser, backgroundColor: roleColor }}><User size={16} color="#fff" /></div>
                  <div style={{ ...styles.messageBubble, backgroundColor: roleColor, color: '#fff' }}>{msg.content}</div>
                </>
              )}
            </div>
          ))}

          {npcReplies.map((reply) => (
            <div key={reply.id} style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
              <div style={{ ...styles.npcAvatar, backgroundColor: '#FFB366' }}><Bot size={16} color="#fff" /></div>
              <div>
                <div style={styles.npcName}>{reply.character}</div>
                <div style={styles.npcBubble}>{reply.text}</div>
              </div>
            </div>
          ))}

          {victimReaction && (
            <div style={{ ...styles.victimReaction, borderColor: `${roleColor}60` }}>
              <div style={{ ...styles.victimLabel, color: roleColor }}>👀 小明的反应</div>
              <div style={styles.victimText}>{victimReaction}</div>
            </div>
          )}

          {isLoading && <TypingIndicator color={roleColor} />}
          {showEncouragement && round > 0 && <div style={styles.encouragement}>{ENCOURAGEMENT_MESSAGES[round - 1] || '你做得很好！✨'}</div>}
          {apiError && <div style={{ ...styles.errorBox, borderColor: `${roleColor}60` }}><span style={{ fontSize: 14, color: roleColor }}>{apiError}</span></div>}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.inputArea}>
          <div style={{ ...styles.tipBox, backgroundColor: `${roleColor}15`, borderColor: `${roleColor}30` }}>
            <span style={{ fontSize: 13, color: '#666' }}>💬 你会怎么做？</span>
          </div>
          <div style={styles.inputContainer}>
            <input type="text" style={{ ...styles.input, borderColor: `${roleColor}40` }} placeholder={`以"${config.userIs}"的身份说...`} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }} disabled={isLoading} />
            <button style={{ ...styles.sendButton, backgroundColor: inputValue.trim() && !isLoading ? roleColor : '#E5E5EA', transform: inputValue.trim() ? 'scale(1.05)' : 'scale(1)' }} onClick={handleSend} disabled={!inputValue.trim() || isLoading}><Send size={20} color="#fff" /></button>
          </div>
        </div>
      </div>
    );
  }

  // ===== 视图八：复盘加载中 =====
  if (view === VIEW.REVIEW_LOADING) {
    return (
      <div style={styles.reviewLoadingContainer}>
        <Confetti />
        <div style={styles.loadingCharacter}><Sparkles size={60} color="#B8A9D4" /></div>
        <div style={styles.loadingSpinner} />
        <p style={styles.loadingText}>✨ 心理老师正在整理你的精彩表现...</p>
        <p style={styles.loadingHint}>你真的很棒！🌟</p>
      </div>
    );
  }

  // ===== 视图九：复盘报告 =====
  if (view === VIEW.REVIEW) {
    return (
      <div style={styles.reviewContainer}>
        <Confetti />
        <div style={styles.reviewHeader}>
          <div style={styles.completionBadge}><Star size={24} fill="#FFD700" color="#FFD700" /></div>
          <span style={{ ...styles.reviewBadge, backgroundColor: roleColor }}>✨ 复盘报告</span>
          <h2 style={styles.reviewTitle}>「{config.userIs}」演练完成</h2>
          <p style={styles.reviewSubtitle}>🌈 你的每一次选择都很重要！</p>
        </div>
        <div style={{ ...styles.reviewCard, borderColor: `${roleColor}40` }}>
          <div style={styles.reviewIcon}><Heart size={32} color={roleColor} /></div>
          <p style={styles.reviewContent}>{reviewContent}</p>
        </div>
        <div style={styles.reviewActions}>
          <button style={{ ...styles.replayButton, backgroundColor: roleColor }} onClick={replay}><RotateCcw size={18} /> 再来一次</button>
          <button style={{ ...styles.backButton, borderColor: roleColor, color: roleColor }} onClick={goHome}><Home size={18} /> 返回首页</button>
        </div>
        <div style={styles.reviewFooter}>💖 记住：你永远不是一个人</div>
      </div>
    );
  }

  // 通知 Toast
  return (
    <>
      <GlobalNotification notification={notification} onDismiss={dismissNotification} />
    </>
  );
}

// 全局通知组件
function GlobalNotification({ notification, onDismiss }) {
  if (!notification) return null;
  return (
    <div style={styles.globalNotificationWrapper} onClick={onDismiss}>
      <div style={{
        ...styles.globalNotification,
        backgroundColor: notification.type === 'success' ? '#E8F5E9' : '#FFF8F0',
        borderColor: notification.type === 'success' ? '#4CAF50' : '#FFB366',
      }}>
        <span style={{ fontSize: 15 }}>{notification.message}</span>
        <button 
          style={styles.notificationDismiss}
          onClick={onDismiss}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ===== 子视图：首页 =====
function HomeView({ setView, setCurrentScenario }) {
  const img = (prompt, imageSize) => {
    return `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${imageSize}`;
  };

  const heroImage = img(
    'A warm cinematic editorial illustration of Chinese elementary school children walking into a sunlit school corridor, gentle smiles, supportive friendship, soft natural light, modern children book illustration, high detail, subtle grain, uplifting and safe atmosphere, no text, no logo',
    'landscape_16_9'
  );
  const stepsImage = img(
    'A modern children book illustration showing a three-step journey: a child writing a story, an open book turning into a stage, and a warm heart-shaped badge of confidence, soft pastel colors, clean composition, high detail, subtle paper texture, no text',
    'portrait_4_3'
  );
  const trustImage = img(
    'Close-up illustration of two small hands gently holding a glowing heart-shaped lantern, warm peach and mint tones, soft rim light, dreamy yet realistic, subtle grain, high detail, no text',
    'square_hd'
  );

  const handleQuickStart = () => {
    const s = scenarioStorage.getDefaultScenarios()[0];
    if (s) {
      setCurrentScenario(s);
      setView(VIEW.ROLE_SELECT);
      return;
    }
    setView(VIEW.SCENARIO_LIBRARY);
  };

  return (
    <div className="landing">
      <div className="landingBg" aria-hidden="true">
        <div className="orb orbA" />
        <div className="orb orbB" />
        <div className="orb orbC" />
      </div>

      <header className="landingNav">
        <div className="navInner">
          <div className="brand">
            <span className="brandMark" aria-hidden="true">✦</span>
            <span className="brandName">别想欺负我</span>
            <span className="brandTag">儿童反欺凌教育</span>
          </div>
          <nav className="navLinks" aria-label="首页导航">
            <button className="navLink" onClick={() => setView(VIEW.SCENARIO_LIBRARY)}>场景库</button>
            <button className="navLink" onClick={() => setView(VIEW.STORY_INPUT)}>生成剧本</button>
          </nav>
          <button className="navCta" onClick={() => setView(VIEW.STORY_INPUT)}>
            <Sparkles size={18} /> 立即开始
          </button>
        </div>
      </header>

      <main className="landingMain">
        <section className="hero">
          <div className="heroText">
            <div className="heroKicker">
              <span className="kickerPill">安全空间</span>
              <span className="kickerPill kickerPillAlt">可重复练习</span>
              <span className="kickerPill kickerPillAlt2">温暖不评判</span>
            </div>
            <h1 className="heroTitle">
              把“说不出口”的经历<br />变成能练习的勇敢
            </h1>
            <p className="heroSub">
              用 AI 把你的故事写成剧本，再用角色扮演练习回应与求助。每一次表达，都更接近自信与安全感。
            </p>

            <div className="heroActions">
              <button className="primaryBtn" onClick={() => setView(VIEW.STORY_INPUT)}>
                <Wand2 size={18} /> 我来描述（生成剧本）
              </button>
              <button className="secondaryBtn" onClick={() => setView(VIEW.SCENARIO_LIBRARY)}>
                <BookOpen size={18} /> 去场景库看看
              </button>
              <button className="ghostBtn" onClick={handleQuickStart}>
                <Zap size={18} /> 快速开始
              </button>
            </div>

            <div className="heroBadges">
              <div className="miniBadge">
                <ShieldCheck size={16} /> 温和引导
              </div>
              <div className="miniBadge">
                <MessageCircle size={16} /> 练习表达
              </div>
              <div className="miniBadge">
                <HandHeart size={16} /> 学会求助
              </div>
            </div>
          </div>

          <div className="heroMedia">
            <div className="heroFrame">
              <img className="heroImg" src={heroImage} alt="温暖的校园与支持的友谊" />
              <div className="heroGlow" aria-hidden="true" />
            </div>
            <div className="heroCaption">
              你不需要“完美回答”，只需要“开始练习”。
            </div>
          </div>
        </section>

        <section className="section">
          <div className="sectionHeader">
            <h2 className="sectionTitle">三步把经历变成力量</h2>
            <p className="sectionDesc">从故事到剧本，从剧本到演练，从演练到复盘建议。</p>
          </div>
          <div className="steps">
            <div className="stepsCard">
              <div className="step">
                <div className="stepNum">01</div>
                <div className="stepBody">
                  <div className="stepTitle">讲述你的故事</div>
                  <div className="stepText">不用写得好，只要真实。我们会帮助你把重点说清楚。</div>
                </div>
              </div>
              <div className="step">
                <div className="stepNum">02</div>
                <div className="stepBody">
                  <div className="stepTitle">生成专属剧本</div>
                  <div className="stepText">把场景拆成角色、对话轮次与开场旁白，让演练更像真的发生过。</div>
                </div>
              </div>
              <div className="step">
                <div className="stepNum">03</div>
                <div className="stepBody">
                  <div className="stepTitle">角色扮演 + 复盘</div>
                  <div className="stepText">练习回应、设边界、求助方式，并得到一份温暖具体的复盘报告。</div>
                </div>
              </div>
            </div>
            <div className="stepsMedia">
              <img className="stepsImg" src={stepsImage} alt="从故事到演练的三步示意插画" />
              <div className="stepsNote">
                <div className="stepsNoteTitle">适合亲子一起做</div>
                <div className="stepsNoteText">家长/老师可以用“旁观者/支持者”的角色参与，学会更好的陪伴方式。</div>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="sectionHeader">
            <h2 className="sectionTitle">你会在这里得到什么</h2>
            <p className="sectionDesc">不仅是“知道”，更是“做得到”。</p>
          </div>
          <div className="featureGrid">
            {[
              { icon: <Wand2 size={18} />, title: '把经历写成剧本', desc: '更贴近真实困扰，练习有针对性。' },
              { icon: <Users size={18} />, title: '多角色视角', desc: '被针对者、旁观者、起哄者、观察者，换位理解更完整。' },
              { icon: <MessageCircle size={18} />, title: '对话演练', desc: '一句一句练习回应，逐渐建立边界感与表达能力。' },
              { icon: <Heart size={18} />, title: '温暖复盘报告', desc: '把你做得好的地方讲清楚，也给出下一次更稳的选择。' },
            ].map((f, i) => (
              <div key={i} className="featureCard">
                <div className="featureIcon">{f.icon}</div>
                <div className="featureTitle">{f.title}</div>
                <div className="featureDesc">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="section trust">
          <div className="trustCard">
            <div className="trustText">
              <h2 className="sectionTitle">温柔，但不软弱</h2>
              <p className="sectionDesc">
                这里不是“评判对错”的地方，而是一个能反复练习的空间。你可以用自己的节奏，慢慢学会说出不舒服、表达需求、寻求帮助。
              </p>
              <div className="trustActions">
                <button className="primaryBtn" onClick={() => setView(VIEW.STORY_INPUT)}>
                  <Sparkles size={18} /> 现在就开始练
                </button>
                <button className="secondaryBtn" onClick={() => setView(VIEW.SCENARIO_LIBRARY)}>
                  <Play size={18} /> 先体验一个场景
                </button>
              </div>
            </div>
            <div className="trustMedia">
              <img className="trustImg" src={trustImage} alt="被温柔守护的心灯" />
              <div className="trustTag">你值得被守护</div>
            </div>
          </div>
        </section>

        <footer className="landingFooter">
          <div className="footerInner">
            <div className="footerLine">
              <span className="footerDot" aria-hidden="true" />
              <span>每一次勇敢表达，都会被温柔接住。</span>
            </div>
            <button className="footerCta" onClick={() => setView(VIEW.STORY_INPUT)}>
              <Wand2 size={18} /> 生成我的专属剧本
            </button>
          </div>
        </footer>
      </main>

      <style>{`
        .landing {
          min-height: 100vh;
          background: radial-gradient(1200px 900px at 12% 10%, rgba(255, 179, 102, 0.28), transparent 60%),
                      radial-gradient(900px 700px at 85% 15%, rgba(126, 206, 193, 0.22), transparent 55%),
                      radial-gradient(1000px 800px at 70% 90%, rgba(184, 169, 212, 0.22), transparent 55%),
                      linear-gradient(180deg, #FEFCF8 0%, #FAFAFD 80%);
          color: #1c1b1f;
          position: relative;
          overflow-x: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .landingBg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          filter: blur(2px);
        }
        .orb {
          position: absolute;
          border-radius: 999px;
          opacity: 0.7;
          mix-blend-mode: multiply;
          transform: translateZ(0);
          animation: drift 10s ease-in-out infinite;
        }
        .orbA {
          width: 420px;
          height: 420px;
          left: -120px;
          top: 220px;
          background: radial-gradient(circle at 30% 30%, rgba(255, 179, 102, 0.65), rgba(255, 179, 102, 0.15) 55%, transparent 70%);
          animation-duration: 12s;
        }
        .orbB {
          width: 520px;
          height: 520px;
          right: -180px;
          top: 80px;
          background: radial-gradient(circle at 55% 35%, rgba(126, 206, 193, 0.55), rgba(126, 206, 193, 0.12) 55%, transparent 70%);
          animation-duration: 14s;
          animation-delay: -2s;
        }
        .orbC {
          width: 520px;
          height: 520px;
          right: 18%;
          bottom: -240px;
          background: radial-gradient(circle at 40% 30%, rgba(184, 169, 212, 0.55), rgba(184, 169, 212, 0.12) 55%, transparent 70%);
          animation-duration: 16s;
          animation-delay: -4s;
        }
        .landingNav {
          position: sticky;
          top: 0;
          z-index: 10;
          backdrop-filter: blur(10px);
          background: rgba(254, 252, 248, 0.7);
          border-bottom: 1px solid rgba(0,0,0,0.06);
        }
        .navInner {
          max-width: 1120px;
          margin: 0 auto;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }
        .brand {
          display: flex;
          align-items: baseline;
          gap: 10px;
          letter-spacing: -0.2px;
          white-space: nowrap;
        }
        .brandMark {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(255, 179, 102, 0.28), rgba(126, 206, 193, 0.18));
          box-shadow: 0 10px 30px rgba(255, 179, 102, 0.18);
          font-weight: 900;
        }
        .brandName {
          font-size: 16px;
          font-weight: 850;
        }
        .brandTag {
          font-size: 12px;
          font-weight: 650;
          color: rgba(28, 27, 31, 0.55);
          padding-left: 8px;
          border-left: 1px solid rgba(0,0,0,0.1);
        }
        .navLinks {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .navLink {
          border: none;
          background: transparent;
          cursor: pointer;
          font-weight: 650;
          color: rgba(28, 27, 31, 0.7);
          padding: 10px 12px;
          border-radius: 12px;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .navLink:hover {
          background: rgba(0,0,0,0.04);
          color: rgba(28, 27, 31, 0.9);
        }
        .navCta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border: none;
          cursor: pointer;
          padding: 10px 14px;
          border-radius: 14px;
          font-weight: 750;
          color: #fff;
          background: linear-gradient(135deg, #FF9F40, #FFB366);
          box-shadow: 0 14px 30px rgba(255, 179, 102, 0.26);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          white-space: nowrap;
        }
        .navCta:hover {
          transform: translateY(-1px);
          box-shadow: 0 18px 40px rgba(255, 179, 102, 0.32);
        }
        .landingMain {
          position: relative;
          z-index: 1;
          max-width: 1120px;
          margin: 0 auto;
          padding: 28px 20px 64px;
        }
        .hero {
          display: grid;
          grid-template-columns: 1.08fr 0.92fr;
          gap: 26px;
          align-items: center;
          padding: 22px 0 10px;
        }
        .heroText {
          padding: 18px 4px;
        }
        .heroKicker {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 14px;
        }
        .kickerPill {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          font-weight: 750;
          font-size: 12px;
          background: rgba(255, 179, 102, 0.18);
          color: #C56C1E;
          border: 1px solid rgba(255, 179, 102, 0.28);
        }
        .kickerPillAlt {
          background: rgba(126, 206, 193, 0.16);
          color: #2E8B7F;
          border-color: rgba(126, 206, 193, 0.26);
        }
        .kickerPillAlt2 {
          background: rgba(184, 169, 212, 0.18);
          color: #6B5B93;
          border-color: rgba(184, 169, 212, 0.26);
        }
        .heroTitle {
          font-size: 48px;
          line-height: 1.04;
          margin: 0 0 14px 0;
          letter-spacing: -1px;
          font-weight: 900;
        }
        .heroSub {
          margin: 0 0 18px 0;
          font-size: 16px;
          line-height: 1.7;
          color: rgba(28, 27, 31, 0.68);
          max-width: 44ch;
        }
        .heroActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .primaryBtn, .secondaryBtn, .ghostBtn {
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 16px;
          font-weight: 750;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        .primaryBtn {
          color: #fff;
          background: linear-gradient(135deg, #FF9F40, #FFB366);
          box-shadow: 0 14px 30px rgba(255, 179, 102, 0.26);
        }
        .primaryBtn:hover { transform: translateY(-1px); box-shadow: 0 18px 40px rgba(255, 179, 102, 0.32); }
        .secondaryBtn {
          background: rgba(255,255,255,0.75);
          color: rgba(28, 27, 31, 0.85);
          border: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 10px 24px rgba(0,0,0,0.06);
        }
        .secondaryBtn:hover { transform: translateY(-1px); box-shadow: 0 14px 30px rgba(0,0,0,0.08); }
        .ghostBtn {
          background: transparent;
          color: rgba(28, 27, 31, 0.72);
          border: 1px dashed rgba(0,0,0,0.14);
        }
        .ghostBtn:hover { background: rgba(255,255,255,0.5); transform: translateY(-1px); }
        .heroBadges {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 8px;
        }
        .miniBadge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 650;
          padding: 10px 12px;
          border-radius: 16px;
          background: rgba(255,255,255,0.6);
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 10px 24px rgba(0,0,0,0.05);
        }
        .heroMedia {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .heroFrame {
          position: relative;
          border-radius: 26px;
          overflow: hidden;
          border: 1px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.55);
          box-shadow: 0 30px 80px rgba(0,0,0,0.12);
          transform: translateZ(0);
        }
        .heroImg {
          display: block;
          width: 100%;
          height: auto;
          object-fit: cover;
          filter: saturate(1.05) contrast(1.03);
        }
        .heroGlow {
          position: absolute;
          inset: -30%;
          background: radial-gradient(circle at 30% 20%, rgba(255, 179, 102, 0.35), transparent 60%),
                      radial-gradient(circle at 80% 70%, rgba(126, 206, 193, 0.28), transparent 55%);
          opacity: 0.6;
          pointer-events: none;
        }
        .heroCaption {
          font-size: 13px;
          font-weight: 650;
          color: rgba(28, 27, 31, 0.6);
          padding: 10px 12px;
          border-radius: 16px;
          background: rgba(255,255,255,0.55);
          border: 1px solid rgba(0,0,0,0.06);
        }
        .section {
          margin-top: 44px;
        }
        .sectionHeader {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .sectionTitle {
          margin: 0;
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.4px;
        }
        .sectionDesc {
          margin: 0;
          color: rgba(28, 27, 31, 0.62);
          font-size: 14px;
          line-height: 1.6;
          max-width: 64ch;
        }
        .steps {
          display: grid;
          grid-template-columns: 1fr 0.92fr;
          gap: 18px;
        }
        .stepsCard {
          border-radius: 24px;
          border: 1px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.72);
          box-shadow: 0 18px 50px rgba(0,0,0,0.07);
          padding: 18px;
        }
        .step {
          display: flex;
          gap: 14px;
          padding: 14px;
          border-radius: 18px;
        }
        .step + .step { border-top: 1px dashed rgba(0,0,0,0.12); border-radius: 0; }
        .stepNum {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 950;
          letter-spacing: 0.4px;
          background: linear-gradient(135deg, rgba(255, 179, 102, 0.22), rgba(184, 169, 212, 0.18));
          color: rgba(28, 27, 31, 0.76);
        }
        .stepTitle { font-weight: 850; margin-bottom: 6px; }
        .stepText { color: rgba(28, 27, 31, 0.62); line-height: 1.6; font-size: 14px; }
        .stepsMedia {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .stepsImg {
          width: 100%;
          border-radius: 24px;
          border: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 18px 50px rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.55);
        }
        .stepsNote {
          padding: 14px 16px;
          border-radius: 22px;
          background: rgba(255,255,255,0.62);
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 14px 36px rgba(0,0,0,0.06);
        }
        .stepsNoteTitle { font-weight: 900; margin-bottom: 6px; }
        .stepsNoteText { color: rgba(28, 27, 31, 0.62); line-height: 1.6; font-size: 14px; }

        .featureGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .featureCard {
          border-radius: 22px;
          padding: 16px 16px 18px;
          background: rgba(255,255,255,0.72);
          border: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 14px 36px rgba(0,0,0,0.06);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .featureCard:hover { transform: translateY(-2px); box-shadow: 0 20px 48px rgba(0,0,0,0.08); }
        .featureIcon {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(255, 179, 102, 0.18), rgba(126, 206, 193, 0.14));
          color: rgba(28, 27, 31, 0.85);
          margin-bottom: 10px;
        }
        .featureTitle { font-weight: 900; margin-bottom: 6px; }
        .featureDesc { color: rgba(28, 27, 31, 0.62); line-height: 1.6; font-size: 14px; }

        .trustCard {
          border-radius: 28px;
          padding: 18px;
          background: linear-gradient(135deg, rgba(255, 179, 102, 0.12), rgba(126, 206, 193, 0.12), rgba(184, 169, 212, 0.12));
          border: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 22px 60px rgba(0,0,0,0.08);
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 16px;
          align-items: center;
        }
        .trustText { padding: 12px 12px 14px; }
        .trustActions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
        .trustMedia {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .trustImg {
          width: 100%;
          max-width: 320px;
          border-radius: 24px;
          border: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 20px 50px rgba(0,0,0,0.12);
          background: rgba(255,255,255,0.6);
        }
        .trustTag {
          position: absolute;
          bottom: 14px;
          left: 50%;
          transform: translateX(-50%);
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(28, 27, 31, 0.72);
          color: #fff;
          font-weight: 750;
          font-size: 12px;
          border: 1px solid rgba(255,255,255,0.25);
        }

        .landingFooter {
          margin-top: 46px;
          padding: 20px 0 0;
        }
        .footerInner {
          border-radius: 26px;
          background: rgba(255,255,255,0.72);
          border: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 18px 50px rgba(0,0,0,0.07);
          padding: 18px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }
        .footerLine {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-weight: 750;
          color: rgba(28, 27, 31, 0.68);
        }
        .footerDot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: linear-gradient(135deg, #FF9F40, #7ECEC1);
          box-shadow: 0 10px 20px rgba(255, 179, 102, 0.22);
        }
        .footerCta {
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 16px;
          font-weight: 850;
          color: #fff;
          background: rgba(28, 27, 31, 0.92);
          box-shadow: 0 16px 34px rgba(0,0,0,0.18);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .footerCta:hover { transform: translateY(-1px); box-shadow: 0 20px 44px rgba(0,0,0,0.22); }

        @keyframes drift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(0, -18px, 0) scale(1.03); }
        }

        @media (max-width: 980px) {
          .hero { grid-template-columns: 1fr; }
          .heroTitle { font-size: 40px; }
          .steps { grid-template-columns: 1fr; }
          .trustCard { grid-template-columns: 1fr; }
          .featureGrid { grid-template-columns: repeat(2, 1fr); }
          .navLinks { display: none; }
        }
        @media (max-width: 520px) {
          .heroTitle { font-size: 34px; }
          .featureGrid { grid-template-columns: 1fr; }
          .navInner { padding: 12px 14px; }
          .landingMain { padding: 22px 14px 54px; }
          .navCta { padding: 10px 12px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .orb { animation: none; }
        }
      `}</style>
    </div>
  );
}

// ===== 子视图：讲述故事 =====
function StoryInputView({ setView, onScenarioGenerated, generateInBackground }) {
  const [story, setStory] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!story.trim()) {
      setError('请先讲述你的故事');
      return;
    }
    setIsGenerating(true);
    setError('');
    try {
      saveUserStory(story);
      const scenario = await generateScenarioFromStory(story);
      if (onScenarioGenerated) {
        onScenarioGenerated(scenario);
      }
      setView(VIEW.SCENARIO_PREVIEW);
    } catch (e) {
      setError(e.message || '生成失败，请重试');
      console.error('生成剧本失败:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  // 如果正在生成，显示加载状态
  if (isGenerating) {
    return (
      <div style={styles.generatingContainer}>
        <div style={styles.generatingContent}>
          <div style={styles.generatingIcon}>
            <Wand2 size={48} color="#FFB366" />
          </div>
          <div style={styles.generatingSpinner} />
          <h2 style={styles.generatingTitle}>✨ 正在生成剧本</h2>
          <p style={styles.generatingHint}>
            AI 正在分析你的故事<br />
            请稍候片刻...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.selectContainer}>
      <button 
        style={{ ...styles.backBtn, marginBottom: 16 }} 
        onClick={() => setView(VIEW.HOME)}
      >
        <ArrowLeft size={20} /> 返回首页
      </button>

      <div style={styles.selectHeader}>
        <div style={{ ...styles.logoContainer, backgroundColor: '#FFF8F0' }}><Wand2 size={40} color="#FFB366" /></div>
        <h1 style={styles.selectTitle}>讲述你的故事</h1>
        <p style={styles.selectSubtitle}>✨ 告诉我们你遇到过的事情，我们会为你生成专属剧本</p>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Card>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#333' }}>📝 你的故事</h3>
          <textarea
            style={styles.storyInput}
            placeholder={`在这里描述你遇到过的事情，比如：\n\n• 有人给你起了难听的外号\n• 被同学排挤或孤立\n• 被威胁或恐吓\n• 被抢东西或被打\n• 其他让你不舒服的事情\n\n不用担心说得不好，我们只是想了解情况。`}
            value={story}
            onChange={(e) => setStory(e.target.value)}
          />
          {error && <p style={{ color: '#FF6B6B', fontSize: 14, marginTop: 8 }}>{error}</p>}
          
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <Button onClick={handleGenerate} disabled={!story.trim()} icon={<Wand2 size={18} />}>
                ✨ 生成剧本
              </Button>
              <Button variant="secondary" onClick={() => setView(VIEW.HOME)}>取消</Button>
            </div>
            <button 
              style={{
                padding: '12px 24px',
                borderRadius: 16,
                border: '2px dashed #E5E5EA',
                backgroundColor: '#FAFAFD',
                color: '#888',
                fontSize: 14,
                fontWeight: 600,
                cursor: story.trim() ? 'pointer' : 'not-allowed',
                opacity: story.trim() ? 1 : 0.5,
              }}
              onClick={() => {
                if (story.trim() && generateInBackground) {
                  saveUserStory(story);
                  generateInBackground(story);
                  setView(VIEW.HOME);
                }
              }}
              disabled={!story.trim()}
            >
              🔄 后台生成（完成后自动保存到场景库）
            </button>
          </div>
        </Card>

        <div style={{ marginTop: 24, padding: '16px 20px', backgroundColor: '#FFF8F0', borderRadius: 16 }}>
          <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7, margin: 0 }}>
            💡 <strong>为什么要讲述故事？</strong><br />
            每个人的经历都是独特的。通过描述你自己的故事，AI会生成一个更贴近你实际情况的演练场景，帮助你更好地学习和准备。
          </p>
        </div>
      </div>
    </div>
  );
}

// ===== 子视图：场景库 =====
function ScenarioLibraryView({ setView, onSelectScenario, onEditScenario }) {
  const [scenarios, setScenarios] = useState(scenarioStorage.getAll());
  const [activeTab, setActiveTab] = useState('all');

  const userScenarios = scenarios.filter(s => !s.isDefault);
  const defaultScenarios = scenarios.filter(s => s.isDefault);
  const displayedScenarios = activeTab === 'all' ? scenarios : activeTab === 'user' ? userScenarios : defaultScenarios;

  const handleDelete = (id) => {
    if (scenarioStorage.delete(id)) {
      setScenarios(scenarioStorage.getAll());
    }
  };

  return (
    <div style={styles.selectContainer}>
      <button style={{ ...styles.backBtn, marginBottom: 16 }} onClick={() => setView(VIEW.HOME)}>
        <ArrowLeft size={20} /> 返回首页
      </button>

      <div style={styles.selectHeader}>
        <div style={{ ...styles.logoContainer, backgroundColor: '#F0FFFE' }}><BookOpen size={40} color="#7ECEC1" /></div>
        <h1 style={styles.selectTitle}>场景库</h1>
        <p style={styles.selectSubtitle}>选择场景开始演练，或创建你自己的剧本</p>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* 标签页 */}
        <div style={styles.tabs}>
          <button style={{ ...styles.tab, ...(activeTab === 'all' ? styles.tabActive : {}) }} onClick={() => setActiveTab('all')}>全部</button>
          <button style={{ ...styles.tab, ...(activeTab === 'user' ? styles.tabActive : {}) }} onClick={() => setActiveTab('user')}>我的创作</button>
          <button style={{ ...styles.tab, ...(activeTab === 'default' ? styles.tabActive : {}) }} onClick={() => setActiveTab('default')}>预设场景</button>
        </div>

        {/* 场景列表 */}
        <div style={styles.scenarioList}>
          {displayedScenarios.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ color: '#999', fontSize: 16 }}>还没有创建任何场景</p>
              <Button style={{ marginTop: 16 }} onClick={() => onEditScenario(null)} icon={<Plus size={18} />}>创建第一个场景</Button>
            </Card>
          ) : (
            displayedScenarios.map((scenario, i) => (
              <div key={scenario.id} style={{ ...styles.scenarioItem, animation: `floatIn 0.3s ease-out ${i * 0.05}s both` }}>
                <div style={styles.scenarioInfo} onClick={() => onSelectScenario(scenario)}>
                  <div style={styles.scenarioHeader}>
                    <h3 style={styles.scenarioTitle}>{scenario.title}</h3>
                    {scenario.isDefault && <span style={styles.defaultBadge}>预设</span>}
                  </div>
                  <p style={styles.scenarioDesc}>{scenario.description}</p>
                  <div style={styles.scenarioMeta}>
                    <span>👥 {scenario.characters?.length || 0}个角色</span>
                    <span>🔄 {scenario.maxRounds || 4}轮对话</span>
                  </div>
                </div>
                <div style={styles.scenarioActions}>
                  <button style={styles.actionBtn} onClick={() => onSelectScenario(scenario)} title="开始演练"><Play size={18} color="#7ECEC1" /></button>
                  {!scenario.isDefault && (
                    <>
                      <button style={styles.actionBtn} onClick={() => onEditScenario(scenario)} title="编辑"><Edit3 size={18} color="#FFB366" /></button>
                      <button style={styles.actionBtn} onClick={() => handleDelete(scenario.id)} title="删除"><Trash2 size={18} color="#FF6B6B" /></button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 创建新场景按钮 */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Button onClick={() => onEditScenario(null)} icon={<Plus size={18} />} size="large">
            创建新场景
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===== 子视图：场景编辑器 =====
function ScenarioEditorView({ setView, scenario, onSave }) {
  const [form, setForm] = useState(scenario || {
    title: '',
    description: '',
    story: '',
    difficulty: 'medium',
    characters: [
      { id: 'victim', name: '小明', role: '被针对的同学', personality: '内向、敏感', emoji: '🛡️', color: '#E8A0A0', systemPrompt: '', avatar: '' },
      { id: 'bully', name: '小刚', role: '欺负人的同学', personality: '调皮', emoji: '😈', color: '#FFB366', systemPrompt: '', avatar: '' },
    ],
    victimNarrator: '你遇到了这种情况...',
    victimScene: '（这一幕正在发生...）',
    maxRounds: 4,
    reviewPrompt: '',
  });
  const [mode, setMode] = useState('simple'); // simple or advanced
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    if (!form.title.trim()) {
      alert('请输入场景标题');
      return;
    }
    setSaving(true);
    const savedScenario = scenarioStorage.save(form);
    setSaving(false);
    onSave(savedScenario);
  };

  const updateCharacter = (index, field, value) => {
    const newChars = [...form.characters];
    newChars[index] = { ...newChars[index], [field]: value };
    setForm({ ...form, characters: newChars });
  };

  return (
    <div style={styles.selectContainer}>
      <button style={{ ...styles.backBtn, marginBottom: 16 }} onClick={() => setView(VIEW.SCENARIO_LIBRARY)}>
        <ArrowLeft size={20} /> 返回场景库
      </button>

      <div style={styles.selectHeader}>
        <div style={{ ...styles.logoContainer, backgroundColor: '#F8F5FF' }}><Edit3 size={40} color="#B8A9D4" /></div>
        <h1 style={styles.selectTitle}>{scenario ? '编辑场景' : '创建新场景'}</h1>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* 模式切换 */}
        <div style={styles.modeSwitch}>
          <button style={{ ...styles.modeBtn, ...(mode === 'simple' ? styles.modeBtnActive : {}) }} onClick={() => setMode('simple')}>简单模式</button>
          <button style={{ ...styles.modeBtn, ...(mode === 'advanced' ? styles.modeBtnActive : {}) }} onClick={() => setMode('advanced')}>高级模式</button>
        </div>

        <Card style={{ marginBottom: 20 }}>
          <h3 style={styles.sectionTitle}>📋 基本信息</h3>
          <div style={styles.formGroup}>
            <label style={styles.label}>场景标题</label>
            <input style={styles.input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="例如：被起外号" />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>场景描述</label>
            <input style={styles.input} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="简要描述这个场景" />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>对话轮数</label>
            <select style={styles.input} value={form.maxRounds} onChange={e => setForm({ ...form, maxRounds: parseInt(e.target.value) })}>
              <option value={3}>3轮（简短）</option>
              <option value={4}>4轮（标准）</option>
              <option value={5}>5轮（较长）</option>
            </select>
          </div>
        </Card>

        <Card style={{ marginBottom: 20 }}>
          <h3 style={styles.sectionTitle}>👥 角色配置</h3>
          {form.characters.map((char, i) => (
            <div key={char.id} style={{ ...styles.characterCard, borderColor: char.color }}>
              <div style={styles.characterHeader}>
                <span style={{ fontSize: 24 }}>{char.emoji}</span>
                <input style={{ ...styles.input, flex: 1, fontWeight: 600 }} value={char.name} onChange={e => updateCharacter(i, 'name', e.target.value)} placeholder="角色名" />
                <input style={{ ...styles.input, width: 100 }} value={char.role} onChange={e => updateCharacter(i, 'role', e.target.value)} placeholder="角色身份" />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>性格特点</label>
                <input style={styles.input} value={char.personality} onChange={e => updateCharacter(i, 'personality', e.target.value)} placeholder="例如：内向、敏感" />
              </div>
              {mode === 'advanced' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>AI提示词（高级）</label>
                  <textarea style={{ ...styles.textarea, borderColor: char.color }} value={char.systemPrompt} onChange={e => updateCharacter(i, 'systemPrompt', e.target.value)} placeholder="输入角色扮演的系统提示词..." rows={4} />
                </div>
              )}
            </div>
          ))}
        </Card>

        {mode === 'advanced' && (
          <Card style={{ marginBottom: 20 }}>
            <h3 style={styles.sectionTitle}>🎭 场景设置</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>被欺负角色 - 开场旁白</label>
              <textarea style={styles.textarea} value={form.victimNarrator} onChange={e => setForm({ ...form, victimNarrator: e.target.value })} placeholder="作为被欺负角色时的开场旁白" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>被欺负角色 - 场景描述</label>
              <textarea style={styles.textarea} value={form.victimScene} onChange={e => setForm({ ...form, victimScene: e.target.value })} placeholder="场景描述" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>复盘提示词</label>
              <textarea style={styles.textarea} value={form.reviewPrompt} onChange={e => setForm({ ...form, reviewPrompt: e.target.value })} placeholder="复盘时的AI提示词" />
            </div>
          </Card>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Button onClick={handleSave} disabled={saving} icon={<Save size={18} />} size="large">
            {saving ? '保存中...' : '💾 保存场景'}
          </Button>
          <Button variant="secondary" onClick={() => setView(VIEW.SCENARIO_LIBRARY)}>取消</Button>
        </div>
      </div>
    </div>
  );
}

// ===== 子视图：场景预览 =====
function ScenarioPreviewView({ setView, scenario, onEdit, onStart }) {
  if (!scenario) {
    return (
      <div style={styles.selectContainer}>
        <button style={{ ...styles.backBtn, marginBottom: 16 }} onClick={() => setView(VIEW.HOME)}>
          <ArrowLeft size={20} /> 返回首页
        </button>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ color: '#999', fontSize: 16 }}>剧本加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.selectContainer}>
      <button style={{ ...styles.backBtn, marginBottom: 16 }} onClick={() => setView(VIEW.STORY_INPUT)}>
        <ArrowLeft size={20} /> 返回
      </button>

      <div style={styles.selectHeader}>
        <div style={styles.completionBadge}><Star size={24} fill="#FFD700" color="#FFD700" /></div>
        <h1 style={styles.selectTitle}>✨ 剧本已生成</h1>
        <p style={styles.selectSubtitle}>检查一下剧本是否符合你的预期</p>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Card style={{ marginBottom: 20 }}>
          <h3 style={styles.sectionTitle}>📖 {scenario.title}</h3>
          <p style={{ color: '#666', fontSize: 15, lineHeight: 1.7 }}>{scenario.description}</p>
          {scenario.story && (
            <div style={{ marginTop: 16, padding: 16, backgroundColor: '#FFF8F0', borderRadius: 12 }}>
              <p style={{ fontSize: 13, color: '#999', marginBottom: 8 }}>原始故事：</p>
              <p style={{ fontSize: 14, color: '#666', fontStyle: 'italic' }}>{scenario.story}</p>
            </div>
          )}
        </Card>

        <Card style={{ marginBottom: 20 }}>
          <h3 style={styles.sectionTitle}>👥 角色</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {scenario.characters?.map((char, i) => (
              <div key={char.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#FAFAFD', borderRadius: 12 }}>
                <span style={{ fontSize: 32 }}>{char.emoji}</span>
                <div>
                  <p style={{ fontWeight: 600, margin: 0, color: char.color }}>{char.name}</p>
                  <p style={{ fontSize: 13, color: '#888', margin: 0 }}>{char.personality}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button onClick={() => onStart('victim')} size="large" icon={<Play size={18} />}>
            🎭 开始演练
          </Button>
          <Button variant="secondary" onClick={onEdit} icon={<Edit3 size={18} />}>
            ✏️ 调整剧本
          </Button>
          <Button variant="ghost" onClick={() => { scenarioStorage.save(scenario); setView(VIEW.SCENARIO_LIBRARY); }}>
            💾 保存到场景库
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===== 样式 =====
const styles = {
  // ===== 移动端友好首页样式 =====
  mobileHomeContainer: {
    minHeight: '100vh',
    backgroundColor: '#FEFCF8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: 'relative',
    overflow: 'hidden',
    padding: '0 20px',
    boxSizing: 'border-box',
  },
  mobileHeader: {
    textAlign: 'center',
    paddingTop: 40,
    marginBottom: 20,
  },
  mobileBadge: {
    display: 'inline-block',
    padding: '6px 16px',
    backgroundColor: 'rgba(255,179,102,0.15)',
    color: '#FF9F40',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 12,
    animation: 'floatIn 0.5s ease-out both',
  },
  mobileTitle: {
    fontSize: 32,
    fontWeight: 800,
    color: '#333',
    margin: '0 0 8px 0',
    animation: 'floatIn 0.5s ease-out 0.1s both',
  },
  mobileSubtitle: {
    fontSize: 14,
    color: '#888',
    margin: 0,
    lineHeight: 1.5,
    animation: 'floatIn 0.5s ease-out 0.2s both',
  },
  floatingDecorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 0,
  },
  floatEmoji: {
    position: 'absolute',
    fontSize: 20,
    animation: 'float 6s ease-in-out infinite',
    opacity: 0.6,
  },
  mobileHeroWrapper: {
    width: '100%',
    maxWidth: 400,
    margin: '0 auto 24px',
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 12px 40px rgba(255,179,102,0.15)',
    animation: 'floatIn 0.6s ease-out 0.3s both',
    position: 'relative',
    zIndex: 1,
  },
  mobileHeroImage: {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
  iconButtonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    maxWidth: 500,
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
    animation: 'floatIn 0.5s ease-out 0.4s both',
  },
  iconButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 12px',
    border: 'none',
    borderRadius: 20,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    minHeight: 130,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  iconLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: '#333',
    marginBottom: 4,
  },
  iconHint: {
    fontSize: 11,
    color: '#999',
  },
  mobileFooter: {
    textAlign: 'center',
    padding: '40px 20px 50px',
    position: 'relative',
    zIndex: 1,
  },
  mobileFooterText: {
    fontSize: 14,
    color: '#B8A9D4',
    fontWeight: 600,
    margin: 0,
  },

  // ===== 生成中加载状态 =====
  generatingContainer: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEFCF8',
    padding: 24,
  },
  generatingContent: {
    textAlign: 'center',
    maxWidth: 300,
  },
  generatingIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF8F0',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto 24px',
    animation: 'pulse 2s ease-in-out infinite',
  },
  generatingSpinner: {
    width: 40,
    height: 40,
    border: '4px solid #FFE4CC',
    borderTopColor: '#FFB366',
    borderRadius: '50%',
    margin: '0 auto 24px',
    animation: 'spin 1s linear infinite',
  },
  generatingTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#333',
    margin: '0 0 12px 0',
  },
  generatingHint: {
    fontSize: 15,
    color: '#888',
    lineHeight: 1.6,
    margin: 0,
  },

  // ===== 通知提示 =====
  appWrapper: {
    minHeight: '100vh',
    position: 'relative',
  },
  notificationWrapper: {
    position: 'fixed',
    top: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    animation: 'slideInDown 0.3s ease-out',
  },
  notificationToast: {
    padding: '14px 24px',
    borderRadius: 16,
    border: '2px solid',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    maxWidth: 400,
  },

  // ===== 全局通知样式 =====
  globalNotificationWrapper: {
    position: 'fixed',
    top: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    cursor: 'pointer',
    animation: 'slideInDown 0.3s ease-out',
  },
  globalNotification: {
    padding: '14px 20px',
    borderRadius: 16,
    border: '2px solid',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    maxWidth: 360,
    minWidth: 200,
  },
  notificationDismiss: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    color: '#999',
    cursor: 'pointer',
    padding: 0,
    marginLeft: 4,
  },

  // ===== 原有样式 =====
  selectContainer: {
    maxWidth: '800px', margin: '0 auto', minHeight: '100vh',
    padding: '40px 24px', backgroundColor: '#FAFAFD',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  selectHeader: { textAlign: 'center', marginBottom: 36 },
  logoContainer: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#FFF8F0',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    margin: '0 auto 16px',
    boxShadow: '0 8px 24px rgba(255, 179, 102, 0.2)',
  },
  selectTitle: { fontSize: 32, fontWeight: 800, color: '#333', margin: '0 0 12px 0' },
  selectSubtitle: { fontSize: 16, color: '#666', margin: 0 },
  selectHint: { fontSize: 14, color: '#999', marginTop: 12 },
  backBtn: { display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'transparent', border: 'none', color: '#666', fontSize: 15, cursor: 'pointer', padding: '8px 0' },
  backBtnSmall: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, backgroundColor: '#F5F5F8', border: 'none', borderRadius: 12, cursor: 'pointer' },
  
  // 入口卡片
  entryCard: {
    display: 'flex', alignItems: 'center', gap: 16, padding: 24,
    backgroundColor: '#fff', borderRadius: 20, border: '3px solid',
    cursor: 'pointer', transition: 'all 0.2s',
  },
  entryIcon: { width: 64, height: 64, borderRadius: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  entryContent: { flex: 1 },
  entryTitle: { fontSize: 20, fontWeight: 700, margin: '0 0 4px 0' },
  entryDesc: { fontSize: 14, color: '#666', margin: 0 },
  footerTip: { textAlign: 'center', marginTop: 40, fontSize: 14, color: '#999', padding: '16px 24px', backgroundColor: '#F8F8FC', borderRadius: 16 },
  
  // 角色卡片
  roleGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 },
  roleCard: {
    border: '3px solid', borderRadius: 24, padding: 24, textAlign: 'center',
    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  
  // 表单
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 8 },
  input: { width: '100%', padding: '12px 16px', fontSize: 15, borderRadius: 12, border: '2px solid #E5E5EA', outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: 12, fontSize: 14, borderRadius: 12, border: '2px solid #E5E5EA', outline: 'none', resize: 'vertical', fontFamily: 'inherit' },
  storyInput: { width: '100%', minHeight: 200, padding: 16, fontSize: 15, borderRadius: 12, border: '2px solid #E5E5EA', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 },
  
  // 场景库
  tabs: { display: 'flex', gap: 8, marginBottom: 20, backgroundColor: '#fff', padding: 8, borderRadius: 16 },
  tab: { flex: 1, padding: '12px 16px', fontSize: 15, fontWeight: 600, backgroundColor: 'transparent', border: 'none', borderRadius: 12, cursor: 'pointer', color: '#666' },
  tabActive: { backgroundColor: '#FFB366', color: '#fff' },
  scenarioList: { display: 'flex', flexDirection: 'column', gap: 12 },
  scenarioItem: { display: 'flex', alignItems: 'center', gap: 16, padding: 20, backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  scenarioInfo: { flex: 1, cursor: 'pointer' },
  scenarioHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  scenarioTitle: { fontSize: 17, fontWeight: 700, color: '#333', margin: 0 },
  defaultBadge: { fontSize: 11, padding: '2px 8px', backgroundColor: '#F0F0F5', color: '#666', borderRadius: 10 },
  scenarioDesc: { fontSize: 14, color: '#666', margin: '0 0 8px 0' },
  scenarioMeta: { display: 'flex', gap: 16, fontSize: 13, color: '#999' },
  scenarioActions: { display: 'flex', gap: 8 },
  actionBtn: { width: 40, height: 40, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8FC', border: 'none', borderRadius: 12, cursor: 'pointer' },
  
  // 编辑器
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#333', marginBottom: 16 },
  modeSwitch: { display: 'flex', backgroundColor: '#fff', borderRadius: 16, padding: 6, marginBottom: 20 },
  modeBtn: { flex: 1, padding: '12px 16px', fontSize: 15, fontWeight: 600, backgroundColor: 'transparent', border: 'none', borderRadius: 12, cursor: 'pointer', color: '#666' },
  modeBtnActive: { backgroundColor: '#B8A9D4', color: '#fff' },
  characterCard: { padding: 16, backgroundColor: '#FAFAFD', borderRadius: 16, border: '2px solid', marginBottom: 16 },
  characterHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  
  // 聊天
  container: { maxWidth: '600px', margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FAFAFD', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  chatHeader: { padding: '12px 16px', backgroundColor: '#fff', borderBottom: '1px solid #F0F0F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  chatHeaderLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  roleTag: { color: '#fff', fontSize: 14, fontWeight: 600, padding: '6px 14px', borderRadius: 20 },
  endButton: { fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 12, fontWeight: 500 },
  progressStars: { display: 'flex', gap: 4 },
  chatBox: { flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 },
  messageRow: { display: 'flex', alignItems: 'flex-end', gap: 10 },
  narratorBubble: { width: '100%', textAlign: 'center', fontSize: 15, color: '#888', padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sceneBubble: { width: '100%', textAlign: 'center', fontSize: 14, color: '#666', backgroundColor: '#FFFDF5', padding: '14px 20px', borderRadius: 16, border: '2px solid', lineHeight: 1.6 },
  avatarUser: { width: 36, height: 36, borderRadius: 18, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  messageBubble: { maxWidth: '75%', padding: '12px 16px', borderRadius: 20, fontSize: 15, lineHeight: 1.5 },
  npcAvatar: { width: 36, height: 36, borderRadius: 18, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  npcName: { fontSize: 12, color: '#999', marginBottom: 4, marginLeft: 4 },
  npcBubble: { backgroundColor: '#F5F5F8', color: '#333', padding: '12px 16px', borderRadius: 20, fontSize: 15, maxWidth: '72%', lineHeight: 1.5 },
  victimReaction: { width: '100%', padding: '14px 18px', backgroundColor: '#FAFAFA', borderRadius: 16, borderLeft: '4px solid', marginTop: 4 },
  victimLabel: { fontSize: 12, fontWeight: 600, marginBottom: 6 },
  victimText: { fontSize: 14, color: '#666', fontStyle: 'italic', lineHeight: 1.6 },
  typingBubble: { backgroundColor: '#F5F5F8', padding: '14px 20px', borderRadius: 20, display: 'flex', gap: 6, alignItems: 'center' },
  typingDot: { fontSize: 8, color: '#B8A9D4' },
  encouragement: { textAlign: 'center', padding: '10px', fontSize: 16, fontWeight: 600, color: '#FFB366' },
  errorBox: { textAlign: 'center', padding: '12px 16px', backgroundColor: '#FFFDF5', borderRadius: 12, border: '2px solid', marginTop: 8 },
  inputArea: { padding: '16px 20px', backgroundColor: '#fff', borderTop: '1px solid #F0F0F5', boxShadow: '0 -4px 12px rgba(0,0,0,0.04)' },
  tipBox: { display: 'flex', alignItems: 'center', marginBottom: 12, padding: '10px 14px', borderRadius: 12, border: '2px solid' },
  inputContainer: { display: 'flex', gap: 12, alignItems: 'center' },
  sendButton: { width: 52, height: 52, borderRadius: 26, border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' },
  
  // 复盘
  reviewLoadingContainer: { maxWidth: '600px', margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFD', gap: 20 },
  loadingCharacter: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F5F0FF', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  loadingSpinner: { width: 40, height: 40, border: '4px solid #F0F0F5', borderTopColor: '#B8A9D4', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  loadingText: { fontSize: 20, color: '#333', fontWeight: 600, margin: 0 },
  loadingHint: { fontSize: 16, color: '#999', margin: 0 },
  reviewContainer: { maxWidth: '600px', margin: '0 auto', minHeight: '100vh', padding: '40px 24px', backgroundColor: '#FAFAFD' },
  reviewHeader: { textAlign: 'center', marginBottom: 32 },
  completionBadge: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF8E0', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 16px' },
  reviewBadge: { display: 'inline-block', color: '#fff', fontSize: 14, fontWeight: 600, padding: '6px 16px', borderRadius: 20, marginBottom: 12 },
  reviewTitle: { fontSize: 24, fontWeight: 700, color: '#333', margin: 0 },
  reviewSubtitle: { fontSize: 16, color: '#999', marginTop: 8 },
  reviewCard: { backgroundColor: '#fff', borderRadius: 24, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', marginBottom: 28, border: '3px solid' },
  reviewIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF5F5', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 16px' },
  reviewContent: { fontSize: 17, color: '#444', lineHeight: 1.9, margin: 0, whiteSpace: 'pre-wrap', textAlign: 'center' },
  reviewActions: { display: 'flex', gap: 16 },
  replayButton: { flex: 1, padding: '16px 24px', color: '#fff', fontSize: 16, fontWeight: 600, border: 'none', borderRadius: 16, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 },
  backButton: { flex: 1, padding: '16px 24px', backgroundColor: '#fff', fontSize: 16, fontWeight: 600, border: '2px solid', borderRadius: 16, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 },
  reviewFooter: { textAlign: 'center', marginTop: 32, fontSize: 16, color: '#B8A9D4', fontWeight: 600 },
  
  confettiContainer: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1000 },
  confettiPiece: { position: 'absolute', width: 10, height: 10, borderRadius: 2, top: -10, animation: 'fall 3s ease-in forwards' },
};

// 注入动画样式
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
  @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } }
  @keyframes slideInDown { from { transform: translateX(-50%) translateY(-20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
`;
document.head.appendChild(styleSheet);
