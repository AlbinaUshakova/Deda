'use client';

type PlayLetterAudioOptions = {
  audioSrc?: string;
  fallbackText: string;
  preferredVoices?: SpeechSynthesisVoice[];
  onStart?: (mode: 'audio' | 'speech') => void;
  onEnd?: () => void;
  onError?: () => void;
};

type InlinePlayableAudio = HTMLAudioElement & { playsInline?: boolean };

let sharedAudio: InlinePlayableAudio | null = null;
let playbackToken = 0;

function getSharedAudio() {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = 'auto';
    sharedAudio.playsInline = true;
    sharedAudio.setAttribute('playsinline', '');
  }
  return sharedAudio;
}

export function stopLetterAudioPlayback() {
  playbackToken += 1;
  if (typeof window === 'undefined') return;

  if (sharedAudio) {
    sharedAudio.pause();
    sharedAudio.currentTime = 0;
    sharedAudio.onended = null;
    sharedAudio.onerror = null;
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
      onError?.();
      finish();
    };

    try {
      onStart?.('speech');
      synth.resume();
      synth.speak(utterance);
    } catch {
      if (token !== playbackToken) return;
      onError?.();
      finish();
    }
  };

  if (!audioSrc) {
    playSpeechFallback();
    return;
  }

  try {
    const audio = getSharedAudio();
    audio.pause();
    audio.src = audioSrc;
    audio.preload = 'auto';
    audio.currentTime = 0;
    audio.volume = 1;
    audio.onended = finish;
    audio.onerror = () => {
      if (token !== playbackToken) return;
      playSpeechFallback();
    };

    onStart?.('audio');
    await audio.play();
  } catch {
    if (token !== playbackToken) return;
    playSpeechFallback();
  }
}
