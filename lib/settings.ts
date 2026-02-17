'use client';

export type Settings = {
  lessonTargetScore: number;
};

const KEY = 'deda_settings_v1';
const DEFAULT_SETTINGS: Settings = {
  lessonTargetScore: 50,
};

function normalizeLessonTargetScore(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return DEFAULT_SETTINGS.lessonTargetScore;
  const rounded = Math.round(num);
  return Math.max(10, Math.min(100, rounded));
}

export function getSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    return {
      lessonTargetScore: normalizeLessonTargetScore(raw.lessonTargetScore),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function setSettings(s: Settings) {
  if (typeof window === 'undefined') return;
  const normalized: Settings = {
    lessonTargetScore: normalizeLessonTargetScore(s.lessonTargetScore),
  };
  localStorage.setItem(KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent('deda:settings-updated'));
}
