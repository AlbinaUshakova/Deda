'use client';

import staticEpisodes from '@/public/content/episodes.json';
import ep1Json from '@/public/content/ka_ru_ep1.json';
import ep2Json from '@/public/content/ka_ru_ep2.json';
import ep3Json from '@/public/content/ka_ru_ep3.json';
import ep4Json from '@/public/content/ka_ru_ep4.json';
import ep5Json from '@/public/content/ka_ru_ep5.json';
import ep6Json from '@/public/content/ka_ru_ep6.json';
import ep7Json from '@/public/content/ka_ru_ep7.json';
import ep8Json from '@/public/content/ka_ru_ep8.json';
import ep9Json from '@/public/content/ka_ru_ep9.json';

export type EpisodesListItem = { id: string; title: string; best?: number };
export type EpisodesData = {
  episodes: EpisodesListItem[];
  lettersByEpisode: Record<string, string[]>;
};

type StaticEpisodeWithCards = {
  id: string;
  letters?: string[];
  cards?: Array<{ ge_text?: string }>;
};

export type EpisodeCard = {
  type: 'word' | 'phrase' | 'letter';
  ge_text: string;
  ru_meaning: string;
  audio_url?: string;
  topic?: string;
};

export type EpisodeData = {
  id: string;
  title: string;
  cards: EpisodeCard[];
} | null;

const EPISODES_DATA_CACHE_KEY = 'deda:episodes-data-cache:v2';

let episodesDataCache: EpisodesData | null = null;
let episodesDataPromise: Promise<EpisodesData> | null = null;

const episodeCache = new Map<string, EpisodeData>();
const episodePromiseCache = new Map<string, Promise<EpisodeData>>();

const STATIC_EPISODES_FALLBACK: EpisodesListItem[] = (staticEpisodes as Array<{
  id: string;
  title: string;
}>).map(ep => ({
  id: ep.id,
  title: ep.title,
}));

const STATIC_RAW_EPISODES: StaticEpisodeWithCards[] = [
  ep1Json as StaticEpisodeWithCards,
  ep2Json as StaticEpisodeWithCards,
  ep3Json as StaticEpisodeWithCards,
  ep4Json as StaticEpisodeWithCards,
  ep5Json as StaticEpisodeWithCards,
  ep6Json as StaticEpisodeWithCards,
  ep7Json as StaticEpisodeWithCards,
  ep8Json as StaticEpisodeWithCards,
  ep9Json as StaticEpisodeWithCards,
];

function buildStaticLettersByEpisode(): Record<string, string[]> {
  const isGeorgianLetter = (ch: string) => /[\u10D0-\u10FF]/.test(ch);
  const seen = new Set<string>();
  const result: Record<string, string[]> = {};

  for (const ep of STATIC_RAW_EPISODES) {
    if (Array.isArray(ep.letters) && ep.letters.length > 0) {
      result[ep.id] = ep.letters;
      ep.letters.forEach(ch => seen.add(ch));
      continue;
    }

    const local = new Set<string>();

    for (const card of ep.cards ?? []) {
      const geText = typeof card.ge_text === 'string' ? card.ge_text : '';
      for (const ch of geText) {
        if (!isGeorgianLetter(ch)) continue;
        if (!seen.has(ch)) {
          local.add(ch);
        }
      }
    }

    const letters = Array.from(local).sort((a, b) => a.localeCompare(b, 'ka'));
    result[ep.id] = letters;
    letters.forEach(ch => seen.add(ch));
  }

  return result;
}

const STATIC_LETTERS_BY_EPISODE = buildStaticLettersByEpisode();

function readEpisodesFromLocalStorageCache(): EpisodesData {
  if (typeof window === 'undefined') return { episodes: [], lettersByEpisode: {} };
  try {
    const raw = window.localStorage.getItem(EPISODES_DATA_CACHE_KEY);
    if (!raw) return { episodes: [], lettersByEpisode: {} };
    const parsed = JSON.parse(raw) as {
      episodes?: EpisodesListItem[];
      lettersByEpisode?: Record<string, string[]>;
    };
    return {
      episodes: Array.isArray(parsed.episodes) ? parsed.episodes : [],
      lettersByEpisode:
        parsed.lettersByEpisode && typeof parsed.lettersByEpisode === 'object'
          ? parsed.lettersByEpisode
          : {},
    };
  } catch {
    return { episodes: [], lettersByEpisode: {} };
  }
}

function readEpisodesFallbackFromRawContent(): EpisodesData {
  if (typeof window === 'undefined') return { episodes: [], lettersByEpisode: {} };
  try {
    const raw = window.localStorage.getItem('deda_content_json');
    if (!raw) {
      return { episodes: STATIC_EPISODES_FALLBACK, lettersByEpisode: STATIC_LETTERS_BY_EPISODE };
    }
    const parsed = JSON.parse(raw) as {
      episodes?: Array<{
        id: string;
        title?: string;
        letters?: string[];
        cards?: Array<{ type?: string; ge_text?: string }>;
      }>;
    };
    const episodes = (parsed.episodes ?? []).map(ep => ({
      id: ep.id,
      title: ep.title ?? ep.id,
    }));
    const lettersByEpisode: Record<string, string[]> = {};
    for (const ep of parsed.episodes ?? []) {
      const letters = Array.isArray(ep.letters) && ep.letters.length > 0
        ? ep.letters
        : (ep.cards ?? [])
            .filter(c => c.type === 'letter' && typeof c.ge_text === 'string' && c.ge_text.length > 0)
            .map(c => c.ge_text as string);
      if (letters.length > 0) lettersByEpisode[ep.id] = letters;
    }
    return { episodes, lettersByEpisode };
  } catch {
    return { episodes: STATIC_EPISODES_FALLBACK, lettersByEpisode: STATIC_LETTERS_BY_EPISODE };
  }
}

export function getEpisodesDataSync(): EpisodesData {
  if (episodesDataCache) return episodesDataCache;
  const cached = readEpisodesFromLocalStorageCache();
  if (cached.episodes.length > 0) {
    episodesDataCache = cached;
    return cached;
  }
  const fallback = readEpisodesFallbackFromRawContent();
  episodesDataCache = fallback;
  return fallback;
}

export async function getEpisodesDataCached(forceRefresh = false): Promise<EpisodesData> {
  if (!forceRefresh && episodesDataCache) return episodesDataCache;
  if (!forceRefresh && episodesDataPromise) return episodesDataPromise;

  episodesDataPromise = (async () => {
    try {
      const res = await fetch('/api/content/episodes', { cache: 'force-cache' });
      if (!res.ok) throw new Error('Failed to load episodes');
      const json = (await res.json()) as {
        ok: boolean;
        episodes?: EpisodesListItem[];
        lettersByEpisode?: Record<string, string[]>;
      };
      const data: EpisodesData = {
        episodes: json.episodes ?? [],
        lettersByEpisode: json.lettersByEpisode ?? {},
      };
      episodesDataCache = data;
      try {
        window.localStorage.setItem(EPISODES_DATA_CACHE_KEY, JSON.stringify(data));
      } catch {}
      return data;
    } catch {
      const fallback = getEpisodesDataSync();
      episodesDataCache = fallback;
      return fallback;
    } finally {
      episodesDataPromise = null;
    }
  })();

  return episodesDataPromise;
}

function readEpisodeFromRawContent(episodeId: string): EpisodeData {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('deda_content_json');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      episodes?: Array<{
        id: string;
        title?: string;
        cards?: EpisodeCard[];
      }>;
    };
    const found = (parsed.episodes ?? []).find(e => e.id === episodeId);
    if (!found) return null;
    return {
      id: found.id,
      title: found.title ?? found.id,
      cards: Array.isArray(found.cards) ? found.cards : [],
    };
  } catch {
    return null;
  }
}

export async function getEpisodeByIdCached(episodeId: string): Promise<EpisodeData> {
  if (episodeCache.has(episodeId)) return episodeCache.get(episodeId) ?? null;
  const pending = episodePromiseCache.get(episodeId);
  if (pending) return pending;

  const req = (async () => {
    try {
      const res = await fetch(`/api/content/episode?id=${encodeURIComponent(episodeId)}`, {
        cache: 'force-cache',
      });
      if (res.status === 404) {
        episodeCache.set(episodeId, null);
        return null;
      }
      if (!res.ok) throw new Error('Failed to load episode');
      const json = (await res.json()) as { ok: boolean; episode?: EpisodeData };
      const episode = json.episode ?? null;
      episodeCache.set(episodeId, episode);
      return episode;
    } catch {
      const fallback = readEpisodeFromRawContent(episodeId);
      episodeCache.set(episodeId, fallback);
      return fallback;
    } finally {
      episodePromiseCache.delete(episodeId);
    }
  })();

  episodePromiseCache.set(episodeId, req);
  return req;
}
