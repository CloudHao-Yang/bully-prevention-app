import React from 'react';
import { Shield, Heart, Zap, Eye } from 'lucide-react';

const characterCards = [
  {
    id: 'victim',
    name: '小明',
    role: '被针对的同学',
    description: '经历被起外号的感受，练习如何回应',
    color: '#FF6B6B',
    bg: '#FFF0F0',
    icon: Shield,
    imagePrompt: 'A shy Chinese elementary school boy with glasses, wearing school uniform, looking sad and thoughtful with downcast eyes, soft pastel colors, cartoon style illustration, clean background, Studio Ghibli inspired children's book art',
    personality: '内向、敏感、善良',
  },
  {
    id: 'bystander',
    name: '小亮',
    role: '关心同学的朋友',
    description: '作为旁观者，练习如何帮助和支持被欺负的同学',
    color: '#4ECDC4',
    bg: '#F0FFFE',
    icon: Heart,
    imagePrompt: 'A kind and brave Chinese elementary school boy with confident expression, wearing school uniform, standing tall with determination, warm smile, soft pastel colors, cartoon style illustration, clean background, Studio Ghibli inspired children\'s book art',
    personality: '善良、有正义感',
  },
  {
    id: 'accomplice',
    name: '小强',
    role: '跟着起哄的同学',
    description: '体验跟风者的心理，理解旁观者效应',
    color: '#FFE66D',
    bg: '#FFFEF0',
    icon: Zap,
    imagePrompt: 'An ordinary Chinese elementary school boy with slightly conflicted expression, wearing school uniform, mixed emotions of following the crowd but feeling uneasy, soft pastel colors, cartoon style illustration, clean background, Studio Ghibli inspired children\'s book art',
    personality: '普通、从众、但内心有小善良',
  },
  {
    id: 'observer',
    name: '观察者',
    role: '静静观察的你',
    description: '客观看待整个事件，理解欺凌的完整链条',
    color: '#A29BFE',
    bg: '#F8F5FF',
    icon: Eye,
    imagePrompt: 'A calm and thoughtful Chinese elementary school child sitting quietly, wearing school uniform, observing the world with curious and analytical eyes, soft purple tones, cartoon style illustration, clean background, Studio Ghibli inspired children\'s book art',
    personality: '冷静、爱思考、有同理心',
  },
];

export default characterCards;
