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

/** Вспомогательная: список epN из файлов ka_ru_epN.json */
function listEpisodeIdsFromFiles(): string[] {
  const files = fs.readdirSync(CONTENT_DIR);
  return files
    .map(f => {
      const m = /^ka_ru_(ep\d+)\.json$/.exec(f);
      return m ? m[1] : null;
    })
    .filter((id): id is string => !!id)
    .sort(
      (a, b) =>
        parseInt(a.replace('ep', ''), 10) -
        parseInt(b.replace('ep', ''), 10),
    );
}

/**
 * Анализирует ВСЕ текущие эпизоды и возвращает только "новые"
 * грузинские буквы по сравнению с предыдущими эпизодами.
 *
 * Пример результата:
 * {
 *   ep1: ['ა','ბ','გ'],
 *   ep2: ['დ','ე'],
 *   ep3: ['ვ', ...],
 *   ...
 * }
 */
export async function loadNewLettersPerEpisode(): Promise<Record<string, string[]>> {
  const ids = listEpisodeIdsFromFiles();
  const seen = new Set<string>();
  const result: Record<string, string[]> = {};

  const isGeorgianLetter = (ch: string) => /[\u10D0-\u10FF]/.test(ch); // диапазон грузинских букв

  for (const id of ids) {
    const ep = loadSingleEp(id);
    if (!ep) {
      result[id] = [];
      continue;
    }

    const local = new Set<string>();

    for (const card of ep.cards) {
      const ge = (card as any).ge_text ?? '';
      for (const ch of ge) {
        if (!isGeorgianLetter(ch)) continue;
        if (!seen.has(ch)) {
          local.add(ch);
        }
      }
    }

    const arr = Array.from(local);
    // Для красоты можно отсортировать по юникоду / локали
    arr.sort((a, b) => a.localeCompare(b, 'ka'));

    result[id] = arr;
    arr.forEach(ch => seen.add(ch));
  }

  return result;
}

/** Загрузка одного эпизода (оставляем как было) */
export async function loadEpisode(id: string): Promise<Episode | null> {
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

  if (id === 'ep1_2') {
    return mergeEpisodes('ep1_2', 'Эпизод 1–2', [loadSingleEp('ep1'), loadSingleEp('ep2')]);
  }
  if (id === 'ep3_4') {
    return mergeEpisodes('ep3_4', 'Эпизод 3–4', [loadSingleEp('ep3'), loadSingleEp('ep4')]);
  }
  if (id === 'ep5_6') {
    return mergeEpisodes('ep5_6', 'Эпизод 5–6', [loadSingleEp('ep5'), loadSingleEp('ep6')]);
  }

  if (/^ep\d+$/.test(id)) {
    return loadSingleEp(id);
  }

  return null;
}

/** Список эпизодов (как у тебя сейчас) */
export async function listEpisodes(): Promise<Array<{ id: string; title: string }>> {
  // здесь оставь ту реализацию, которая у тебя уже есть, например:
  const merged = [
    { id: 'ep1', title: '1' },
    { id: 'ep2', title: '2' },
    { id: 'ep3', title: '3' },
    { id: 'ep4', title: '4' },
    { id: 'ep5', title: '5' },
    { id: 'ep6', title: '6' },
    { id: 'ep7', title: '7' },
    { id: 'ep8', title: '8' },
    { id: 'ep9', title: '9' },
    { id: 'ep10', title: '10' },
    { id: 'ep11', title: '11' },
    { id: 'ep12', title: '12' },
  ];
  const specials = [
    { id: 'favorites', title: '⭐ Избранное' },
    { id: 'all', title: 'Все слова' },
  ];
  return [...merged, ...specials];
}
