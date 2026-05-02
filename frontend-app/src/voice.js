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

export function stopSpeaking() {
  const synth = getSpeechSynthesis();
  if (!synth) return;
  synth.cancel();
}

