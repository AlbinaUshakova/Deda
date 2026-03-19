'use client';

type PlayLetterAudioOptions = {
  audioSrc?: string;
  fallbackText: string;
  preferredVoices?: SpeechSynthesisVoice[];
  onStart?: (mode: 'audio' | 'speech') => void;
  onEnd?: () => void;
  onError?: () => void;
  onDebug?: (message: string) => void;
};

let activeAudio: HTMLAudioElement | null = null;
let playbackToken = 0;

export function stopLetterAudioPlayback() {
  playbackToken += 1;
  if (typeof window === 'undefined') return;

  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio = null;
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export async function playLetterAudio({
  audioSrc,
  fallbackText,
  preferredVoices,
  onStart,
  onEnd,
  onError,
  onDebug,
}: PlayLetterAudioOptions) {
  if (typeof window === 'undefined') return;

  stopLetterAudioPlayback();
  const token = playbackToken;

  const finish = () => {
    if (token !== playbackToken) return;
    onEnd?.();
  };

  const playSpeechFallback = () => {
    if (!('speechSynthesis' in window)) {
      onDebug?.('speech unavailable');
      onError?.();
      finish();
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(fallbackText);
    const voices = preferredVoices?.length ? preferredVoices : synth.getVoices();
    const geVoice = voices.find(v => v.lang?.toLowerCase().startsWith('ka'));

    utterance.lang = 'ka-GE';
    if (geVoice) {
      utterance.voice = geVoice;
      utterance.lang = geVoice.lang;
    }
    utterance.rate = 0.9;
    utterance.onend = finish;
    utterance.onerror = () => {
      if (token !== playbackToken) return;
      onDebug?.('speech error');
      onError?.();
      finish();
    };

    try {
      onStart?.('speech');
      onDebug?.('fallback: speech');
      synth.resume();
      synth.speak(utterance);
    } catch {
      if (token !== playbackToken) return;
      onDebug?.('speech start failed');
      onError?.();
      finish();
    }
  };

  if (!audioSrc) {
    onDebug?.('no audio src');
    playSpeechFallback();
    return;
  }

  try {
    const audio = new Audio(audioSrc);
    activeAudio = audio;
    audio.preload = 'auto';
    audio.currentTime = 0;
    audio.volume = 1;
    audio.onended = () => {
      if (token !== playbackToken) return;
      activeAudio = null;
      finish();
    };
    audio.onerror = () => {
      if (token !== playbackToken) return;
      onDebug?.('audio file error');
      activeAudio = null;
      playSpeechFallback();
    };

    onStart?.('audio');
    onDebug?.('audio start');
    await audio.play();
    onDebug?.('audio playing');
  } catch {
    if (token !== playbackToken) return;
    onDebug?.('audio play failed');
    playSpeechFallback();
  }
}
