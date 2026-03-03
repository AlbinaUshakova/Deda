'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSettings } from '@/lib/settings';
import {
  loadProgressMap,
  getLocalProgress,
  type ProgressMap,
} from '@/lib/supabase';

type Ep = { id: string; title: string; best?: number };
type EpisodesApiResponse = {
  ok: boolean;
  episodes?: Ep[];
  lettersByEpisode?: Record<string, string[]>;
};
type LessonStatus = 'mastered' | 'almost' | 'current' | 'locked';
type AlphabetLetterStatus = LessonStatus | 'unknown';
const ALPHABET_STATUS_CACHE_KEY = 'deda:alphabet-letter-status-cache:v1';
const EPISODES_DATA_CACHE_KEY = 'deda:episodes-data-cache:v1';

const letterTranslit: Record<string, string> = {
  'ა': 'a',
  'ბ': 'b',
  'გ': 'g',
  'დ': 'd',
  'ე': 'e',
  'ვ': 'v',
  'ზ': 'z',
  'თ': 't',
  'ი': 'i',
  'კ': "k'",
  'ლ': 'l',
  'მ': 'm',
  'ნ': 'n',
  'ო': 'o',
  'პ': "p'",
  'ჟ': 'zh',
  'რ': 'r',
  'ს': 's',
  'ტ': "t'",
  'უ': 'u',
  'ფ': 'p',
  'ქ': 'k',
  'ღ': 'gh',
  'ყ': "q'",
  'შ': 'sh',
  'ჩ': 'ch',
  'ც': 'ts',
  'ძ': 'dz',
  'წ': "ts'",
  'ჭ': "ch'",
  'ხ': 'kh',
  'ჯ': 'j',
  'ჰ': 'h',
};

const GEORGIAN_ALPHABET = [
  'ა', 'ბ', 'გ', 'დ', 'ე', 'ვ', 'ზ', 'თ', 'ი', 'კ', 'ლ',
  'მ', 'ნ', 'ო', 'პ', 'ჟ', 'რ', 'ს', 'ტ', 'უ', 'ფ', 'ქ',
  'ღ', 'ყ', 'შ', 'ჩ', 'ც', 'ძ', 'წ', 'ჭ', 'ხ', 'ჯ', 'ჰ',
];

function geLetterToTranslit(ch: string): string {
  return letterTranslit[ch] ?? '';
}

const geLetterName: Record<string, string> = {
  'ა': 'ანი',
  'ბ': 'ბანი',
  'გ': 'განი',
  'დ': 'დონი',
  'ე': 'ენი',
  'ვ': 'ვინი',
  'ზ': 'ზენი',
  'თ': 'თანი',
  'ი': 'ინი',
  'კ': 'კანი',
  'ლ': 'ლასი',
  'მ': 'მანი',
  'ნ': 'ნარი',
  'ო': 'ონი',
  'პ': 'პარი',
  'ჟ': 'ჟანი',
  'რ': 'რაე',
  'ს': 'სანი',
  'ტ': 'ტარი',
  'უ': 'უნი',
  'ფ': 'ფარი',
  'ქ': 'ქანი',
  'ღ': 'ღანი',
  'ყ': 'ყარი',
  'შ': 'შინი',
  'ჩ': 'ჩინი',
  'ც': 'ცანი',
  'ძ': 'ძილი',
  'წ': 'წილი',
  'ჭ': 'ჭარი',
  'ხ': 'ხანი',
  'ჯ': 'ჯანი',
  'ჰ': 'ჰაე',
};

const alphabetLetterColorByStatus: Record<AlphabetLetterStatus, string> = {
  mastered: 'text-emerald-600',
  almost: 'text-orange-600',
  current: 'text-yellow-600',
  locked: 'text-slate-500',
  unknown: 'text-indigo-600',
};

const geLetterAudioMap: Record<string, string> = {
  'ა': '/audio/letters/01-ani.mp3',
  'ბ': '/audio/letters/02-bani.mp3',
  'გ': '/audio/letters/03-gani.mp3',
  'დ': '/audio/letters/04-doni.mp3',
  'ე': '/audio/letters/05-eni.mp3',
  'ვ': '/audio/letters/06-vini.mp3',
  'ზ': '/audio/letters/07-zeni.mp3',
  'თ': '/audio/letters/08-tani.mp3',
  'ი': '/audio/letters/09-ini.mp3',
  'კ': '/audio/letters/10-kani.mp3',
  'ლ': '/audio/letters/11-lasi.mp3',
  'მ': '/audio/letters/12-mani.mp3',
  'ნ': '/audio/letters/13-nari.mp3',
  'ო': '/audio/letters/14-oni.mp3',
  'პ': '/audio/letters/15-pari.mp3',
  'ჟ': '/audio/letters/16-jhani.mp3',
  'რ': '/audio/letters/17-rae.mp3',
  'ს': '/audio/letters/18-sani.mp3',
  'ტ': '/audio/letters/19-tari.mp3',
  'უ': '/audio/letters/20-uni.mp3',
  'ფ': '/audio/letters/21-phari.mp3',
  'ქ': '/audio/letters/22-khani-q.mp3',
  'ღ': '/audio/letters/23-ghani.mp3',
  'ყ': '/audio/letters/24-qari.mp3',
  'შ': '/audio/letters/25-shini.mp3',
  'ჩ': '/audio/letters/26-chini.mp3',
  'ც': '/audio/letters/27-tsani.mp3',
  'ძ': '/audio/letters/28-dzili.mp3',
  'წ': '/audio/letters/29-tsili.mp3',
  'ჭ': '/audio/letters/30-chari.mp3',
  'ხ': '/audio/letters/31-khani-x.mp3',
  'ჯ': '/audio/letters/32-jani.mp3',
  'ჰ': '/audio/letters/33-hae.mp3',
};

async function loadEpisodesData(): Promise<{ episodes: Ep[]; lettersByEpisode: Record<string, string[]> }> {
  const res = await fetch('/api/content/episodes', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to load episodes');
  }
  const json = (await res.json()) as EpisodesApiResponse;
  return {
    episodes: json.episodes ?? [],
    lettersByEpisode: json.lettersByEpisode ?? {},
  };
}

function loadEpisodesDataFromCache(): {
  episodes: Ep[];
  lettersByEpisode: Record<string, string[]>;
} {
  if (typeof window === 'undefined') {
    return { episodes: [], lettersByEpisode: {} };
  }
  try {
    const raw = window.localStorage.getItem(EPISODES_DATA_CACHE_KEY);
    if (!raw) return { episodes: [], lettersByEpisode: {} };
    const parsed = JSON.parse(raw) as {
      episodes?: Ep[];
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

function loadEpisodesFromLocalStorageFallback(): {
  episodes: Ep[];
  lettersByEpisode: Record<string, string[]>;
} {
  if (typeof window === 'undefined') {
    return { episodes: [], lettersByEpisode: {} };
  }
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

export default function HomePage() {
  const [eps, setEps] = useState<Ep[]>([]);
  const [showCatHint, setShowCatHint] = useState(false);
  const [showAlphabet, setShowAlphabet] = useState(true);
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [audioError, setAudioError] = useState('');
  const [progress, setProgress] = useState<ProgressMap>({});
  const [lettersByEp, setLettersByEp] = useState<Record<string, string[]>>({});
  const [lessonTargetScore, setLessonTargetScore] = useState(50);
  const [cachedLetterStatusByChar, setCachedLetterStatusByChar] = useState<Record<string, AlphabetLetterStatus>>({});

  useEffect(() => {
    const init = async () => {
      // 1) Быстрый клиентский prefill из local cache (после монтирования, без hydration mismatch)
      const cachedEpisodes = loadEpisodesDataFromCache();
      const fallbackEpisodes =
        cachedEpisodes.episodes.length > 0
          ? cachedEpisodes
          : loadEpisodesFromLocalStorageFallback();
      setEps(fallbackEpisodes.episodes);
      setLettersByEp(fallbackEpisodes.lettersByEpisode);

      const local = getLocalProgress();
      const localMap: ProgressMap = {};
      for (const row of local) {
        localMap[row.episodeId] = Math.max(localMap[row.episodeId] ?? 0, row.best);
      }
      setProgress(localMap);

      setLessonTargetScore(getSettings().lessonTargetScore);
      try {
        const raw = window.localStorage.getItem(ALPHABET_STATUS_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, AlphabetLetterStatus>;
          if (parsed && typeof parsed === 'object') {
            setCachedLetterStatusByChar(parsed);
          }
        }
      } catch {}

      // 2) Актуализация с API
      try {
        const { episodes, lettersByEpisode } = await loadEpisodesData();
        setEps(episodes);
        setLettersByEp(lettersByEpisode);
        try {
          window.localStorage.setItem(
            EPISODES_DATA_CACHE_KEY,
            JSON.stringify({ episodes, lettersByEpisode }),
          );
        } catch {}
      } catch (e) {
        console.error('Failed to load episodes API, fallback to local storage', e);
      }

      // тянем merged-прогресс (локалка+сервер) и мёрджим поверх текущего
      try {
        const merged = await loadProgressMap();
        setProgress(prev => {
          const next: ProgressMap = { ...prev };
          for (const [ep, best] of Object.entries(merged)) {
            const current = next[ep] ?? 0;
            next[ep] = Math.max(current, best as number);
          }
          return next;
        });
      } catch (e) {
        console.error('Failed to load progress map', e);
      }
    };

    init();

    const onUpd = async () => {
      try {
        const merged = await loadProgressMap();
        setProgress(prev => {
          const next: ProgressMap = { ...prev };
          for (const [ep, best] of Object.entries(merged)) {
            const current = next[ep] ?? 0;
            next[ep] = Math.max(current, best as number);
          }
          return next;
        });
      } catch (e) {
        console.error('Failed to refresh progress map', e);
      }
    };

    if (typeof window !== 'undefined') {
      const onSettingsUpd = () => {
        setLessonTargetScore(getSettings().lessonTargetScore);
      };
      window.addEventListener('deda:progress-updated' as any, onUpd);
      window.addEventListener('deda:settings-updated' as any, onSettingsUpd);
      return () =>
      {
        window.removeEventListener('deda:progress-updated' as any, onUpd);
        window.removeEventListener('deda:settings-updated' as any, onSettingsUpd);
      };
    }
  }, []);

  useEffect(() => {
    const onToggleAlphabet = () => {
      setShowAlphabet(v => !v);
    };
    window.addEventListener('deda:toggle-alphabet', onToggleAlphabet as EventListener);
    return () => window.removeEventListener('deda:toggle-alphabet', onToggleAlphabet as EventListener);
  }, []);

  useEffect(() => {
    const onProfileMenuOpened = () => {
      setShowAlphabet(false);
    };
    window.addEventListener(
      'deda:profile-menu-opened',
      onProfileMenuOpened as EventListener,
    );
    return () =>
      window.removeEventListener(
        'deda:profile-menu-opened',
        onProfileMenuOpened as EventListener,
      );
  }, []);

  useEffect(() => {
    if (!showAlphabet) {
      setShowCatHint(false);
    }
  }, [showAlphabet]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const refreshVoices = () => setTtsVoices(synth.getVoices());
    refreshVoices();
    synth.onvoiceschanged = refreshVoices;
    return () => {
      synth.onvoiceschanged = null;
    };
  }, []);

  const speakLetter = (letter: string) => {
    if (typeof window === 'undefined') return;
    setAudioError('');

    const localAudioSrc = geLetterAudioMap[letter];
    if (localAudioSrc) {
      const audio = new Audio(localAudioSrc);
      audio.volume = 1;
      audio.play().catch(() => {
        setAudioError('Не удалось воспроизвести звук буквы');
      });
      return;
    }

    if (!('speechSynthesis' in window)) {
      setAudioError('Грузинская озвучка недоступна в этом браузере');
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(geLetterName[letter] ?? letter);
    const voices = ttsVoices.length ? ttsVoices : synth.getVoices();
    const geVoice = voices.find(v => v.lang?.toLowerCase().startsWith('ka'));
    utterance.lang = 'ka-GE';
    if (geVoice) {
      utterance.voice = geVoice;
      utterance.lang = geVoice.lang;
    }
    utterance.rate = 0.9;
    utterance.onstart = () => setAudioError('');
    utterance.onerror = () => setAudioError('Озвучка недоступна на этом устройстве');
    try {
      synth.resume();
      synth.speak(utterance);
    } catch {
      setAudioError('Не удалось запустить озвучку');
    }
  };

  const normalEpisodes = eps.filter(ep => /^ep\d+$/.test(ep.id));
  const specials = eps.filter(ep => !/^ep\d+$/.test(ep.id));
  const allLessonsReady = normalEpisodes.length > 0 && normalEpisodes.every(ep => (progress[ep.id] ?? 0) > 0);
  const unlockedById: Record<string, boolean> = {};
  for (let i = 0; i < normalEpisodes.length; i += 1) {
    const ep = normalEpisodes[i];
    if (i === 0) {
      unlockedById[ep.id] = true;
      continue;
    }
    const prevId = normalEpisodes[i - 1].id;
    const prevBest = progress[prevId] ?? 0;
    unlockedById[ep.id] = prevBest > 0;
  }
  const recommendedEpId = normalEpisodes
    .filter(ep => unlockedById[ep.id] && (progress[ep.id] ?? 0) < lessonTargetScore)
    .sort((a, b) => {
      const aBest = progress[a.id] ?? 0;
      const bBest = progress[b.id] ?? 0;
      if (aBest !== bBest) return aBest - bBest;
      const aNum = Number(a.id.replace('ep', ''));
      const bNum = Number(b.id.replace('ep', ''));
      return aNum - bNum;
    })[0]?.id;
  const statusById: Record<string, LessonStatus> = {};
  for (const ep of normalEpisodes) {
    const best = progress[ep.id] ?? 0;
    const unlocked = unlockedById[ep.id];
    if (!unlocked) {
      statusById[ep.id] = 'locked';
      continue;
    }
    if (best >= lessonTargetScore) {
      statusById[ep.id] = 'mastered';
      continue;
    }
    statusById[ep.id] = ep.id === recommendedEpId ? 'current' : 'almost';
  }
  const letterStatusByChar: Record<string, AlphabetLetterStatus> = { ...cachedLetterStatusByChar };
  for (const ep of normalEpisodes) {
    const epStatus = statusById[ep.id] ?? 'locked';
    const letters = lettersByEp[ep.id] ?? [];
    for (const ch of letters) {
      if (!letterStatusByChar[ch]) {
        letterStatusByChar[ch] = epStatus;
      }
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(ALPHABET_STATUS_CACHE_KEY, JSON.stringify(letterStatusByChar));
      setCachedLetterStatusByChar(letterStatusByChar);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lettersByEp, lessonTargetScore, progress]);

  return (
    <main
      className="min-h-screen bg-gradient-to-b from-[#f7f8fc] via-[#f3f5fb] to-[#eef2f9] px-3 sm:px-5 lg:px-7 min-[1366px]:px-8 min-[1512px]:px-9 min-[1920px]:px-11 py-4 min-[1920px]:py-6 relative overflow-hidden flex flex-col"
    >
      <div className="relative mx-auto w-full max-w-[1500px] flex-1 flex flex-col justify-start">
      {/* алфавит + сетка эпизодов */}
      <section className="mt-2 min-[1512px]:mt-2.5 min-[1700px]:mt-3 min-[1700px]:pl-10 min-[2200px]:pl-12">
        <div className="relative mx-auto w-full max-w-[1500px]">
          <aside className="hidden lg:block fixed left-16 top-[86px] z-20 h-fit w-[224px] xl:w-[246px]">
            <div
              className={`origin-top-left scale-[0.94] max-h-[calc(100dvh-112px)] overflow-y-auto rounded-3xl border border-slate-200/75 bg-gradient-to-b from-[#f6f8fe]/88 via-[#f1f4fc]/86 to-[#edf1f9]/84 p-3 xl:p-3.5 shadow-[0_6px_14px_rgba(15,23,42,0.09)] transition-all duration-200 ${showAlphabet ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none select-none'}`}
              aria-hidden={!showAlphabet}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold tracking-[-0.01em] text-slate-700">ანბანი</h3>
                <button
                  type="button"
                  onClick={() => setShowAlphabet(v => !v)}
                  className="h-6 w-6 rounded-md border border-slate-300 bg-white text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  aria-label="Скрыть алфавит"
                  title="Скрыть алфавит"
                >
                  ✕
                </button>
              </div>
              <div className="mt-2.5 grid grid-cols-6 gap-x-2 gap-y-2">
                {GEORGIAN_ALPHABET.map(ch => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => speakLetter(ch)}
                    className="rounded-lg border border-slate-200 bg-white py-0.5 text-center shadow-sm hover:bg-slate-50 transition-colors"
                    title={`Озвучить букву ${ch}`}
                    aria-label={`Озвучить букву ${ch}`}
                  >
                    <div className={`text-[19px] leading-none ${alphabetLetterColorByStatus[letterStatusByChar[ch] ?? 'unknown']}`}>{ch}</div>
                    <div className="mt-0.5 text-[10px] leading-none text-slate-500">
                      {geLetterToTranslit(ch)}
                    </div>
                  </button>
                ))}
              </div>
              {audioError && (
                <div className="mt-2 text-[11px] text-red-500">
                  {audioError}
                </div>
              )}
            </div>
          </aside>
          <div className="relative mx-auto w-full max-w-[700px] sm:max-w-[780px] lg:max-w-[1080px] 2xl:max-w-[1240px] min-[1700px]:max-w-[1420px]">
            <div className="grid grid-cols-1 sm:[grid-template-columns:repeat(2,max-content)] lg:[grid-template-columns:repeat(3,max-content)] 2xl:[grid-template-columns:repeat(4,max-content)] min-[1700px]:[grid-template-columns:repeat(5,max-content)] gap-1.5 justify-center">
              {normalEpisodes.map((ep, i) => {
                const best = progress[ep.id] ?? 0;
                const letters = lettersByEp[ep.id] ?? [];
                const progressRatio = Math.min(best / lessonTargetScore, 1);
                const progressPercent = Math.round(progressRatio * 100);
                const status = statusById[ep.id];
                const isRecommended = status === 'current';
                const letterTone =
                  status === 'mastered'
                    ? 'text-emerald-600'
                    : status === 'almost'
                      ? 'text-orange-600'
                      : status === 'current'
                        ? 'text-yellow-600'
                        : 'text-slate-500';
                const translitTone =
                  status === 'mastered'
                    ? 'text-emerald-600/75'
                    : status === 'almost'
                      ? 'text-orange-600/70'
                      : status === 'current'
                        ? 'text-yellow-700/85'
                        : 'text-slate-500/70';
                const progressTone =
                  status === 'mastered'
                    ? 'bg-emerald-400/90'
                    : status === 'almost'
                      ? 'bg-orange-300/90'
                      : status === 'current'
                        ? 'bg-yellow-400/85'
                        : 'bg-slate-600/80';

                return (
                  <div key={ep.id} className="relative w-[228px] min-[1700px]:w-[236px]">
                    <Link href={`/study/${ep.id}`} legacyBehavior>
                      <a
                        className={`lesson-card relative w-full aspect-[1/0.8] rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center gap-1 transition-all duration-200 ease-out shadow-[0_10px_20px_rgba(15,23,42,0.12)] ${status !== 'locked' ? 'lesson-card--interactive hover:z-30 hover:border-indigo-300 hover:bg-slate-50' : 'cursor-not-allowed opacity-65'}`}
                        onClick={e => {
                          if (status === 'locked') e.preventDefault();
                        }}
                        aria-disabled={status === 'locked'}
                      >
                        <div className="absolute top-3 left-4 flex flex-col">
                          <span className="text-base font-semibold text-slate-700">Урок {i + 1}</span>
                          <span className="text-sm text-slate-500">Изучаем буквы</span>
                        </div>
                        {status === 'locked' && (
                          <div className="absolute top-3 right-3 text-sm text-slate-500/90" aria-hidden="true">
                            🔒
                          </div>
                        )}

                        {/* буквы с транскрипцией */}
                        <div className="flex flex-wrap justify-center gap-2 mb-1 min-h-[2rem]">
                          {letters.map(ch => {
                            const tr = geLetterToTranslit(ch);
                            return (
                              <div
                                key={ch}
                                className={`flex flex-col items-center ${letterTone} drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]`}
                              >
                                <span className="text-[2.05rem] leading-none">{ch}</span>
                                {tr && (
                                  <span className={`text-sm ${translitTone} leading-tight mt-1 tracking-wide`}>
                                    {tr}
                                  </span>
                                )}
                              </div>
                            );
                          })}

                          {!letters.length && (
                            <span className="text-xs text-slate-400">
                              без новых букв
                            </span>
                          )}
                        </div>

                        <div className="absolute bottom-3 left-4 w-[42%] max-w-[160px]">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${progressTone}`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-slate-500 whitespace-nowrap">{best}/{lessonTargetScore}</span>
                          </div>
                        </div>
                        {isRecommended && (
                          <div className="absolute bottom-2 right-3 text-base text-orange-300/95 drop-shadow-[0_0_3px_rgba(251,146,60,0.45)]">
                            🐾
                          </div>
                        )}
                        {best >= lessonTargetScore && (
                          <div className="absolute bottom-2 right-2 h-6 w-6">
                            <span className="absolute inset-0 rounded-full bg-amber-300/14 blur-[3px]" />
                            <span className="relative flex h-full w-full items-center justify-center text-base text-amber-300 drop-shadow-[0_0_3px_rgba(251,191,36,0.45)]">
                              🏆
                            </span>
                          </div>
                        )}
                      </a>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Избранное и Все уроки */}
      <section className="mt-4 min-[1512px]:mt-5 min-[1700px]:mt-6 flex flex-wrap justify-center gap-3 max-w-6xl mx-auto">
        {specials.map(ep => {
          const isFav = ep.id === 'favorites';
          const cleanTitle = ep.title.replace(/^⭐\s*/, '');
          const isAllLessons = ep.id === 'all';
          const isDisabled = isAllLessons && !allLessonsReady;

          return (
            <Link key={ep.id} href={`/study/${ep.id}`} legacyBehavior>
              <a
                className={`w-[180px] px-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm text-slate-700 flex items-center justify-center gap-2 transition-colors shadow-[0_8px_18px_rgba(15,23,42,0.1)] ${isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:border-indigo-300 hover:bg-slate-50'}`}
                onClick={e => {
                  if (isDisabled) e.preventDefault();
                }}
                aria-disabled={isDisabled}
                title={isDisabled ? 'Сначала набери минимум 1 очко в каждом уроке' : undefined}
              >
                {isFav && <span>⭐</span>}
                <span>{cleanTitle}</span>
              </a>
            </Link>
          );
        })}
      </section>

      {/* кот Deda слева у поля (привязан к контейнеру, не к вьюпорту) */}
      <div
        className="group/cat hidden lg:block absolute left-3 bottom-6 z-30"
        onMouseEnter={() => setShowCatHint(showAlphabet)}
        onMouseLeave={() => setShowCatHint(false)}
      >
        <div
          className={`pointer-events-none absolute bottom-[calc(100%+2px)] left-[66%] w-[138px] z-40 transition-all ${showCatHint ? 'opacity-90 group-hover/cat:opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}`}
        >
          <div className="relative w-[148px]">
            <svg viewBox="0 0 320 220" className="w-full h-auto drop-shadow-[0_12px_20px_rgba(0,0,0,0.35)]">
              <path
                d="M70 170 C35 170, 20 145, 30 120 C10 105, 18 72, 50 68 C62 40, 98 30, 122 48 C145 20, 190 20, 212 50 C245 40, 275 58, 280 88 C305 98, 312 128, 292 148 C282 162, 262 170, 240 170 C220 186, 96 186, 70 170 Z"
                fill="rgba(255,255,255,0.85)"
                stroke="#64748b"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center px-5 translate-y-1 text-[8px] leading-snug text-center font-semibold tracking-tight text-slate-900">
              Нажми на букву — подскажу, как она звучит
            </div>
          </div>
        </div>
        <img
          src="/images/deda-cat.png"
          alt="Кот Deda, читает книгу"
          className="w-[260px] drop-shadow-[0_10px_24px_rgba(0,0,0,0.5)] animate-cloud"
        />
      </div>
      </div>
    </main>
  );
}
