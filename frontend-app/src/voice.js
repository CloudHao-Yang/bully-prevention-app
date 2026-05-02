export function getSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return null;
  return Recognition;
}

export function createSpeechRecognizer({ lang = 'zh-CN' } = {}) {
  const Recognition = getSpeechRecognition();
  if (!Recognition) return null;

  const recognizer = new Recognition();
  recognizer.lang = lang;
  recognizer.continuous = true;
  recognizer.interimResults = true;
  recognizer.maxAlternatives = 1;

  return recognizer;
}

export function getSpeechSynthesis() {
  if (typeof window === 'undefined') return null;
  return window.speechSynthesis || null;
}

let audioPlayer = null;
let audioUrl = null;

async function speakByDoubaoTts(text, { speaker } = {}) {
  const response = await fetch('/api/doubao/tts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, ...(speaker ? { speaker } : {}) }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    const trimmed = errorText.trim();
    throw new Error(`HTTP ${response.status}${trimmed ? `: ${trimmed.slice(0, 280)}` : ''}`);
  }

  const blob = await response.blob();
  if (!blob.size) throw new Error('Empty audio');

  if (!audioPlayer) {
    audioPlayer = new Audio();
  }

  if (audioUrl) {
    URL.revokeObjectURL(audioUrl);
    audioUrl = null;
  }

  audioUrl = URL.createObjectURL(blob);
  audioPlayer.src = audioUrl;
  audioPlayer.currentTime = 0;
  await audioPlayer.play();
}

export function speakText(text, { lang = 'zh-CN', rate = 1, pitch = 1, volume = 1 } = {}) {
  const synth = getSpeechSynthesis();
  if (!synth) return false;
  if (!text || !text.trim()) return false;

  try {
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    synth.speak(utterance);
    return true;
  } catch (error) {
    return false;
  }
}

export async function speakCloud(text) {
  const clean = (text || '').trim();
  if (!clean) return;
  const speaker = arguments.length > 1 && arguments[1] ? arguments[1].speaker : undefined;
  stopSpeaking();
  await speakByDoubaoTts(clean, { speaker });
}

export async function speak(text, { fallbackToBrowserTts = true, speaker } = {}) {
  const clean = (text || '').trim();
  if (!clean) return;

  stopSpeaking();
  try {
    await speakByDoubaoTts(clean, { speaker });
  } catch (error) {
    if (fallbackToBrowserTts) {
      speakText(clean);
      return;
    }
    throw error;
  }
}

export function stopSpeaking() {
  const synth = getSpeechSynthesis();
  if (synth) synth.cancel();
  if (audioPlayer) {
    try {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
    } catch (error) {
    }
  }
  if (audioUrl) {
    try {
      URL.revokeObjectURL(audioUrl);
    } catch (error) {
    }
    audioUrl = null;
  }
}
