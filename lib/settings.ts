'use client';
type Settings = { studyLang: string; nativeLang: string };
const KEY = 'deda_settings_v1';

export function getSettings(): Settings {
  if (typeof window === 'undefined') return { studyLang: 'KA', nativeLang: 'RU' };
  try { return JSON.parse(localStorage.getItem(KEY) || '') || { studyLang: 'KA', nativeLang: 'RU' }; } catch { return { studyLang: 'KA', nativeLang: 'RU' }; }
}
export function setSettings(s: Settings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(s));
}
