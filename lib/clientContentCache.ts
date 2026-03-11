'use client';

export type EpisodesListItem = { id: string; title: string; best?: number };
export type EpisodesData = {
  episodes: EpisodesListItem[];
  lettersByEpisode: Record<string, string[]>;
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

const EPISODES_DATA_CACHE_KEY = 'deda:episodes-data-cache:v1';

let episodesDataCache: EpisodesData | null = null;
let episodesDataPromise: Promise<EpisodesData> | null = null;

const episodeCache = new Map<string, EpisodeData>();
const episodePromiseCache = new Map<string, Promise<EpisodeData>>();

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
    if (!raw) return { episodes: [], lettersByEpisode: {} };
    const parsed = JSON.parse(raw) as {
      episodes?: Array<{ id: string; title?: string; cards?: Array<{ type?: string; ge_text?: string }> }>;
    };
    const episodes = (parsed.episodes ?? []).map(ep => ({
      id: ep.id,
      title: ep.title ?? ep.id,
    }));
    const lettersByEpisode: Record<string, string[]> = {};
    for (const ep of parsed.episodes ?? []) {
      const letters = (ep.cards ?? [])
        .filter(c => c.type === 'letter' && typeof c.ge_text === 'string' && c.ge_text.length > 0)
        .map(c => c.ge_text as string);
      if (letters.length > 0) lettersByEpisode[ep.id] = letters;
    }
    return { episodes, lettersByEpisode };
  } catch {
    return { episodes: [], lettersByEpisode: {} };
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
