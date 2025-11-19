'use client';

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = (url && key) ? createClient(url, key) : null;

// ===== Типы =====

export type Progress = { episodeId: string; best: number };
export type ProgressMap = Record<string, number>;

// ключ локального хранилища (новая версия)
const LS_KEY = 'deda_progress_v2';

// ===== ЛОКАЛЬНЫЙ ПРОГРЕСС =====

function getLocalProgressArray(): Progress[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

function setLocalProgressArray(p: Progress[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_KEY, JSON.stringify(p));
}

// обновляем локальный прогресс и возвращаем новый best
export function upsertLocalProgress(episodeId: string, score: number): number {
  const p = getLocalProgressArray();
  const i = p.findIndex(x => x.episodeId === episodeId);
  if (i === -1) {
    p.push({ episodeId, best: score });
  } else {
    p[i].best = Math.max(p[i].best, score);
  }
  setLocalProgressArray(p);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('deda:progress-updated'));
  }

  const updated = p.find(x => x.episodeId === episodeId)!;
  return updated.best;
}

// старые функции-обёртки (на случай, если где-то используются)
export function getLocalProgress(): Progress[] {
  return getLocalProgressArray();
}
export function setLocalProgress(p: Progress[]) {
  setLocalProgressArray(p);
}

// ===== РАБОТА С SUPABASE =====

// загружаем прогресс: локальный + серверный, берём максимум,
// при необходимости докидываем более высокий локальный прогресс на сервер
export async function loadProgressMap(): Promise<ProgressMap> {
  // 1) локальный
  const localArr = getLocalProgressArray();
  const map: ProgressMap = {};
  for (const row of localArr) {
    map[row.episodeId] = Math.max(map[row.episodeId] ?? 0, row.best);
  }

  // 2) если нет supabase — всё, выходим
  if (!supabase) return map;

  // 3) берём текущего пользователя
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return map;
  }
  const user = userData.user;

  // 4) грузим прогресс с сервера
  const { data: rows, error } = await supabase
    .from('progress')
    .select('episode_id, best')
    .eq('user_id', user.id);

  if (error || !rows) {
    console.error('load progress error', error);
    return map;
  }

  // 5) сливаем: берём максимум по каждой паре (episodeId)
  const serverMap: ProgressMap = {};
  for (const row of rows as any[]) {
    const ep = row.episode_id as string;
    const best = row.best as number;
    serverMap[ep] = Math.max(serverMap[ep] ?? 0, best);
    map[ep] = Math.max(map[ep] ?? 0, best);
  }

  // 6) если локально где-то лучше, чем на сервере — отправляем апдейт
  const toUpsert: { user_id: string; episode_id: string; best: number }[] = [];
  for (const [ep, best] of Object.entries(map)) {
    const serverBest = serverMap[ep] ?? 0;
    if (best > serverBest) {
      toUpsert.push({ user_id: user.id, episode_id: ep, best });
    }
  }

  if (toUpsert.length) {
    const { error: upErr } = await supabase
      .from('progress')
      .upsert(toUpsert, { onConflict: 'user_id,episode_id' });
    if (upErr) console.error('upsert merged progress error', upErr);
  }

  return map;
}

// универсальный апдейт прогресса: сначала локально, потом (если есть юзер) на сервер
export async function upsertProgress(episodeId: string, score: number) {
  const best = upsertLocalProgress(episodeId, score);

  if (!supabase) return;

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return;

  const user = userData.user;

  const { error } = await supabase
    .from('progress')
    .upsert(
      {
        user_id: user.id,
        episode_id: episodeId,
        best,
      },
      { onConflict: 'user_id,episode_id' },
    );

  if (error) {
    console.error('upsert progress error', error);
  }
}
