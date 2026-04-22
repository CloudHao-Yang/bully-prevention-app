// 首页静态资源 - 图片 URL 配置
// 使用 AI 生成的高质量插画

export const HOME_IMAGES = {
  // 英雄区主图 - 温馨的校园场景
  hero: {
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=A%20warm%20and%20colorful%20illustration%20of%20elementary%20school%20children%20in%20a%20classroom%2C%20some%20kids%20are%20talking%20and%20laughing%20happily%2C%20others%20are%20reading%2C%20sunlight%20streaming%20through%20windows%2C%20soft%20pastel%20colors%2C%20children%27s%20book%20illustration%20style%2C%20Studio%20Ghibli%20inspired%2C%20wholesome%20and%20heartwarming%20atmosphere&image_size=landscape_16_9",
    alt: "温馨的校园场景"
  },
  
  // 故事输入 - 创作插画
  storyInput: {
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=A%20young%20Chinese%20child%20sitting%20at%20a%20desk%20thoughtfully%2C%20looking%20out%20the%20window%20at%20a%20peaceful%20school%20playground%2C%20soft%20dreamy%20colors%2C%20children%27s%20book%20illustration%20style%2C%20warm%20and%20reflective%20mood%2C%20pastel%20tones&image_size=square",
    alt: "讲述故事"
  },
  
  // 场景库 - 书本插画
  scenarioLibrary: {
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=A%20magical%20open%20storybook%20with%20floating%20colorful%20pages%2C%20children%20characters%20appearing%20from%20the%20book%20pages%2C%20soft%20pastel%20colors%2C%20children%27s%20book%20illustration%2C%20whimsical%20and%20magical%20atmosphere&image_size=square",
    alt: "场景库"
  },
  
  // 快速开始 - 闪电侠插画
  quickStart: {
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=A%20cheerful%20Chinese%20elementary%20school%20boy%20with%20confident%20expression%20and%20a%20thumbs%20up%2C%20wearing%20school%20uniform%2C%20bright%20energetic%20colors%20with%20lightning%20bolts%20in%20the%20background%2C%20children%27s%20book%20illustration%20style%2C%20dynamic%20and%20empowering&image_size=square",
    alt: "快速开始"
  },
  
  // 底部插画 - 我们在一起
  together: {
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Different%20Chinese%20elementary%20school%20children%20holding%20hands%20in%20a%20circle%2C%20smiling%20and%20supporting%20each%20other%2C%20a%20rainbow%20above%20them%2C%20heartwarming%20and%20uplifting%20scene%2C%20soft%20pastel%20colors%2C%20children%27s%20book%20illustration%20style&image_size=landscape_16_9",
    alt: "我们在一起"
  },
  
  // 背景装饰 - 云朵
  cloud: {
    url: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=Cute%20fluffy%20white%20cloud%20in%20a%20blue%20sky%2C%20children%27s%20illustration%20style%2C%20soft%20and%20dreamy&image_size=square",
    alt: ""
  },
};

// 动画配置
export const ANIMATIONS = {
  floating: {
    duration: '6s',
    delay: '0s',
    transform: 'translateY(-20px)',
  },
  pulse: {
    duration: '2s',
    delay: '0s',
  },
  shimmer: {
    duration: '3s',
    delay: '0s',
  },
};

// 背景粒子配置
export const PARTICLES = [
  { emoji: '⭐', size: 20, top: '10%', left: '5%', delay: '0s', duration: '8s' },
  { emoji: '✨', size: 16, top: '20%', left: '85%', delay: '1s', duration: '6s' },
  { emoji: '🌟', size: 24, top: '60%', left: '10%', delay: '2s', duration: '10s' },
  { emoji: '💫', size: 18, top: '70%', left: '90%', delay: '0.5s', duration: '7s' },
  { emoji: '⭐', size: 22, top: '40%', left: '3%', delay: '1.5s', duration: '9s' },
  { emoji: '✨', size: 14, top: '85%', left: '75%', delay: '3s', duration: '8s' },
];
