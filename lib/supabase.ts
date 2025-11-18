'use client';

import { createClient } from '@supabase/supabase-js';

// --- Supabase клиент ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Локальный прогресс (fallback для гостей) ---
export type Progress = { episodeId: string; best: number };

const LS_KEY = 'deda_progress_v1';

export function getLocalProgress(): Progress[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function setLocalProgress(p: Progress[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(p));
}

export function upsertLocalProgress(episodeId: string, score: number) {
  const p = getLocalProgress();
  const i = p.findIndex((x) => x.episodeId === episodeId);
  if (i === -1) p.push({ episodeId, best: score });
  else p[i].best = Math.max(p[i].best, score);
  setLocalProgress(p);
}
