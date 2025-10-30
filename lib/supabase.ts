'use client';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabase = (url && key) ? createClient(url, key) : null;

export type Progress = { episodeId: string; best: number };
const LS_KEY = 'deda_progress_v1';
export function getProgress(): Progress[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
export function setProgress(p: Progress[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(p));
}
export function upsertProgress(episodeId: string, score: number) {
  const p = getProgress();
  const i = p.findIndex(x => x.episodeId === episodeId);
  if (i === -1) p.push({ episodeId, best: score });
  else p[i].best = Math.max(p[i].best, score);
  setProgress(p);
}
