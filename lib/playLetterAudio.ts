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
let audioContext: AudioContext | null = null;
let activeBufferSource: AudioBufferSourceNode | null = null;
let activeGainNode: GainNode | null = null;
const audioBufferCache = new Map<string, AudioBuffer>();
let playbackToken = 0;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const ContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!ContextCtor) return null;
    audioContext = new ContextCtor();
  }
  return audioContext;
}

export function stopLetterAudioPlayback() {
  playbackToken += 1;
  if (typeof window === 'undefined') return;

  if (activeBufferSource) {
    try {
      activeBufferSource.onended = null;
      activeBufferSource.stop();
    } catch {
      // Ignore repeated stop calls on finished sources.
    }
    activeBufferSource.disconnect();
    activeBufferSource = null;
  }

  if (activeGainNode) {
    activeGainNode.disconnect();
    activeGainNode = null;
  }

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
    const context = getAudioContext();
    if (context) {
      if (context.state === 'suspended') {
        onDebug?.('audio context resume');
        await context.resume();
      }

      let audioBuffer = audioBufferCache.get(audioSrc);
      if (!audioBuffer) {
        onDebug?.('audio fetch');
        const response = await fetch(audioSrc, { cache: 'force-cache' });
        if (!response.ok) {
          throw new Error(`audio fetch ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        onDebug?.('audio decode');
        audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
        audioBufferCache.set(audioSrc, audioBuffer);
      } else {
        onDebug?.('audio cached');
      }

      const source = context.createBufferSource();
      const gainNode = context.createGain();
      gainNode.gain.value = 1;
      source.buffer = audioBuffer;
      source.connect(gainNode);
      gainNode.connect(context.destination);

      activeBufferSource = source;
      activeGainNode = gainNode;
      source.onended = () => {
        if (token !== playbackToken) return;
        activeBufferSource?.disconnect();
        activeGainNode?.disconnect();
        activeBufferSource = null;
        activeGainNode = null;
        finish();
      };

      onStart?.('audio');
      onDebug?.('audio start');
      source.start(0);
      onDebug?.('audio playing');
      return;
    }

    onDebug?.('audio element fallback');
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
