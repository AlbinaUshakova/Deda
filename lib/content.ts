// lib/content.ts
'use server';

import fs from 'fs';
import path from 'path';

type Card =
  | { type: 'word'; ge_text: string; ru_meaning: string; audio_url?: string }
  | { type: 'phrase'; ge_text: string; ru_meaning: string; audio_url?: string };

export type Episode = {
  id: string;
  title: string;
  cards: Card[];
};

const CONTENT_DIR = path.join(process.cwd(), 'public', 'content');

function readEpisodeJson(file: string): Episode | null {
  try {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const data = JSON.parse(raw);
    return data as Episode;
  } catch {
    return null;
  }
}

function loadSingleEp(id: string): Episode | null {
  // ваши файлы были формата ka_ru_epN.json
  const file = `ka_ru_${id}.json`;
  return readEpisodeJson(file);
}

function mergeEpisodes(newId: string, title: string, eps: (Episode | null)[]): Episode | null {
  const ok = eps.filter(Boolean) as Episode[];
  if (!ok.length) return null;
  return {
    id: newId,
    title,
    cards: ok.flatMap(e => e.cards),
  };
}

/** Специальный список “избранных” хранится в localStorage на клиенте,
 *  но на сервере для /favorites мы вернём просто «пустую заготовку».
 *  Реальная фильтрация происходит на странице study.
 */
export async function loadEpisode(id: string): Promise<Episode | null> {
  // Специальные виртуальные эпизоды
  if (id === 'all') {
    const all: Episode[] = [];
    for (let n = 1; n <= 12; n++) {
      const ep = loadSingleEp(`ep${n}`);
      if (ep) all.push({ ...ep, id: `ep${n}` });
    }
    if (!all.length) return null;
    return {
      id: 'all',
      title: 'Все слова',
      cards: all.flatMap(e => e.cards),
    };
  }
  if (id === 'favorites') {
    const all = await loadEpisode('all');
    if (!all) return null;
    return {
      id: 'favorites',
      title: 'Избранное',
      cards: all.cards,
    };
  }

  // Объединённые эпизоды
  if (id === 'ep1_2') {
    return mergeEpisodes('ep1_2', 'Эпизод 1–2', [loadSingleEp('ep1'), loadSingleEp('ep2')]);
  }
  if (id === 'ep3_4') {
    return mergeEpisodes('ep3_4', 'Эпизод 3–4', [loadSingleEp('ep3'), loadSingleEp('ep4')]);
  }
  if (id === 'ep5_6') {
    return mergeEpisodes('ep5_6', 'Эпизод 5–6', [loadSingleEp('ep5'), loadSingleEp('ep6')]);
  }

  // Обычные одиночные эпизоды
  if (/^ep\d+$/.test(id)) {
    return loadSingleEp(id);
  }

  return null;
}

/** Карта: объединённые + спец + оставить ep7 и ep8 отдельно */
export async function listEpisodes(): Promise<Array<{ id: string; title: string }>> {
  const merged = [
    { id: 'ep1_2', title: '1–2' },
    { id: 'ep3_4', title: '3–4' },
    { id: 'ep5_6', title: '5–6' },
  ];
  const singles = [
    { id: 'ep7', title: '7' },
    { id: 'ep8', title: '8' },
  ];
  const specials = [
    { id: 'favorites', title: '⭐ Избранное' },
    { id: 'all',       title: 'Все слова' },
  ];
  return [...merged, ...singles, ...specials];
}
