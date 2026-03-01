// lib/content.ts
'use server';

import ep1Json from '@/public/content/ka_ru_ep1.json';
import ep2Json from '@/public/content/ka_ru_ep2.json';
import ep3Json from '@/public/content/ka_ru_ep3.json';
import ep4Json from '@/public/content/ka_ru_ep4.json';
import ep5Json from '@/public/content/ka_ru_ep5.json';
import ep6Json from '@/public/content/ka_ru_ep6.json';
import ep7Json from '@/public/content/ka_ru_ep7.json';
import ep8Json from '@/public/content/ka_ru_ep8.json';
import ep9Json from '@/public/content/ka_ru_ep9.json';

type Card =
  | { type: 'word'; ge_text: string; ru_meaning: string; audio_url?: string }
  | { type: 'phrase'; ge_text: string; ru_meaning: string; audio_url?: string };

export type Episode = {
  id: string;
  title: string;
  cards: Card[];
};
type RawEpisode = {
  id: string;
  title: string;
  letters?: string[];
  cards: Array<{ type: 'word' | 'phrase'; ge_text: string; ru_meaning: string; audio_url?: string }>;
};

const RAW_BY_ID: Record<string, RawEpisode> = {
  ep1: ep1Json as RawEpisode,
  ep2: ep2Json as RawEpisode,
  ep3: ep3Json as RawEpisode,
  ep4: ep4Json as RawEpisode,
  ep5: ep5Json as RawEpisode,
  ep6: ep6Json as RawEpisode,
  ep7: ep7Json as RawEpisode,
  ep8: ep8Json as RawEpisode,
  ep9: ep9Json as RawEpisode,
};

function normalizeGeorgianText(text: string): string {
  if (!text) return text;
  // Если строка грузинская, но случайно попала русская "и" — исправляем на грузинскую "ი"
  if (/[\u10D0-\u10FF]/.test(text)) {
    return text.replace(/и/g, 'ი').replace(/И/g, 'ი');
  }
  return text;
}

function normalizeEpisode(ep: Episode): Episode {
  return {
    ...ep,
    cards: ep.cards.map(card => ({
      ...card,
      ge_text: normalizeGeorgianText(card.ge_text),
    })),
  };
}

function loadSingleEp(id: string): Episode | null {
  const raw = RAW_BY_ID[id];
  if (!raw) return null;
  return normalizeEpisode({
    id: raw.id,
    title: raw.title,
    cards: raw.cards.map(c => ({
      type: c.type,
      ge_text: c.ge_text,
      ru_meaning: c.ru_meaning,
      audio_url: c.audio_url,
    })),
  });
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

/** Вспомогательная: id epN, найденные в /public/content */
function listEpisodeIdsFromFiles(): string[] {
  return Object.keys(RAW_BY_ID)
    .filter((id): id is string => /^ep\d+$/.test(id))
    .sort(
      (a, b) =>
        parseInt(a.replace('ep', ''), 10) -
        parseInt(b.replace('ep', ''), 10),
    );
}

/**
 * Возвращает только "новые" грузинские буквы для каждого эпизода
 * (по сравнению с предыдущими).
 */
export async function loadNewLettersPerEpisode(): Promise<Record<string, string[]>> {
  const ids = listEpisodeIdsFromFiles();
  const seen = new Set<string>();
  const result: Record<string, string[]> = {};

  const isGeorgianLetter = (ch: string) => /[\u10D0-\u10FF]/.test(ch);

  for (const id of ids) {
    const raw = RAW_BY_ID[id];
    if (raw?.letters?.length) {
      const local = Array.from(
        new Set(
          raw.letters
            .map(ch => normalizeGeorgianText(ch))
            .filter(ch => isGeorgianLetter(ch) && !seen.has(ch)),
        ),
      );
      const arr = local.sort((a, b) => a.localeCompare(b, 'ka'));
      result[id] = arr;
      arr.forEach(ch => seen.add(ch));
      continue;
    }

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

    const arr = Array.from(local).sort((a, b) => a.localeCompare(b, 'ka'));
    result[id] = arr;
    arr.forEach(ch => seen.add(ch));
  }

  return result;
}

/** Загрузка одного эпизода/раздела */
export async function loadEpisode(id: string): Promise<Episode | null> {
  if (id === 'all') {
    const all: Episode[] = [];
    // Собираем все доступные epN из файлов, без жёсткого цикла на 12
    for (const eid of listEpisodeIdsFromFiles()) {
      const ep = loadSingleEp(eid);
      if (ep) all.push({ ...ep, id: eid });
    }
    if (!all.length) return null;
    return {
      id: 'all',
      title: 'Все уроки',
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

  // При необходимости оставляем склейки
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

/** Список эпизодов на главной */
export async function listEpisodes(): Promise<Array<{ id: string; title: string }>> {
  // Жёстко показываем только 1–9 (как ты и оставила)
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
  ];
  const specials = [
    { id: 'favorites', title: '⭐ Избранное' },
    { id: 'all', title: 'Все уроки' },
  ];
  return [...merged, ...specials];
}
