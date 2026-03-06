'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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
  const [showAlphabet, setShowAlphabet] = useState(false);
  const [alphabetOverlapsLessons, setAlphabetOverlapsLessons] = useState(false);
  const alphabetRef = useRef<HTMLElement | null>(null);
  const phrasesBtnRef = useRef<HTMLButtonElement | null>(null);
  const lessonsWrapRef = useRef<HTMLDivElement | null>(null);
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [audioError, setAudioError] = useState('');
  const [progress, setProgress] = useState<ProgressMap>({});
  const [lettersByEp, setLettersByEp] = useState<Record<string, string[]>>({});
  const [lessonTargetScore, setLessonTargetScore] = useState(50);
  const [cachedLetterStatusByChar, setCachedLetterStatusByChar] = useState<Record<string, AlphabetLetterStatus>>({});
  const alphabetDefaultInitializedRef = useRef(false);

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
    if (typeof window === 'undefined') return;
    const updateAlphabetLayoutMode = () => {
      const alphabetRect = alphabetRef.current?.getBoundingClientRect();
      const lessonsRect = lessonsWrapRef.current?.getBoundingClientRect();
      const canFitWithoutOverlap =
        !!alphabetRect &&
        !!lessonsRect &&
        alphabetRect.right + 16 <= lessonsRect.left;
      setAlphabetOverlapsLessons(!canFitWithoutOverlap);
      if (!alphabetDefaultInitializedRef.current) {
        setShowAlphabet(canFitWithoutOverlap);
        alphabetDefaultInitializedRef.current = true;
      }
    };

    updateAlphabetLayoutMode();
    window.addEventListener('resize', updateAlphabetLayoutMode);
    return () => window.removeEventListener('resize', updateAlphabetLayoutMode);
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
    if (!showAlphabet) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (phrasesBtnRef.current && phrasesBtnRef.current.contains(e.target as Node)) {
        return;
      }
      if (alphabetRef.current && !alphabetRef.current.contains(e.target as Node)) {
        setShowAlphabet(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAlphabet(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showAlphabet]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('deda:alphabet-overlay-state', {
        detail: { open: showAlphabet },
      }),
    );
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
  const allLessonsSpecial = specials.find(ep => ep.id === 'all');
  const favoritesSpecial = specials.find(ep => ep.id === 'favorites');
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
      className="min-h-screen bg-transparent px-3 sm:px-5 lg:px-6 min-[1366px]:px-7 min-[1512px]:px-8 min-[1920px]:px-9 py-3 min-[1920px]:py-6 [@media(max-height:980px)]:py-2 relative overflow-hidden flex flex-col"
    >
      <div className="relative mx-auto w-full flex-1 flex flex-col justify-start">
      {/* алфавит + сетка эпизодов */}
      <section className="mt-1.5 min-[1512px]:mt-2 min-[1700px]:mt-3 min-[1700px]:pl-10 min-[2200px]:pl-12 [@media(max-height:980px)]:mt-1">
        <div className="relative mx-auto w-full">
          <aside ref={alphabetRef} className={`block fixed left-2 sm:left-3 md:left-4 top-[86px] ${alphabetOverlapsLessons ? 'z-[220]' : 'z-[140]'} h-fit w-[188px] sm:w-[210px] md:w-[224px] xl:w-[246px] pointer-events-none`}>
            <div
              className={`home-alphabet-panel pointer-events-auto origin-top-left scale-[0.94] max-h-[calc(100dvh-112px)] overflow-y-auto rounded-3xl border border-slate-200/75 bg-gradient-to-b from-[#f6f8fe]/88 via-[#f1f4fc]/86 to-[#edf1f9]/84 p-3 xl:p-3.5 shadow-[0_6px_14px_rgba(15,23,42,0.09)] transition-all duration-200 ${showAlphabet ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none select-none'}`}
              aria-hidden={!showAlphabet}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="home-alphabet-title text-sm font-semibold tracking-[-0.01em] text-slate-700">ანბანი</h3>
                <button
                  type="button"
                  onClick={() => setShowAlphabet(v => !v)}
                  className="home-alphabet-close h-6 w-6 rounded-md border border-slate-300 bg-white text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  aria-label="Скрыть алфавит"
                  title="Скрыть алфавит"
                >
                  ✕
                </button>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="relative inline-flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7C8CFF] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7C8CFF]" />
                </span>
                <span>Нажми букву</span>
              </div>
              <div className="mt-2.5 grid grid-cols-6 gap-x-2 gap-y-2">
                {GEORGIAN_ALPHABET.map(ch => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => speakLetter(ch)}
                    className="home-alphabet-key cursor-pointer rounded-lg border border-slate-200 bg-white py-0.5 text-center shadow-sm hover:bg-slate-50 transition-colors"
                    title={`Озвучить букву ${ch}`}
                    aria-label={`Озвучить букву ${ch}`}
                  >
                    <div className={`home-alphabet-letter text-[19px] leading-none ${alphabetLetterColorByStatus[letterStatusByChar[ch] ?? 'unknown']} home-alphabet-letter--${letterStatusByChar[ch] ?? 'unknown'}`}>{ch}</div>
                    <div className="home-alphabet-translit mt-0.5 text-[10px] leading-none text-slate-500">
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
              <div className="-mt-4 mb-1 flex justify-end">
                <img
                  src="/images/deda-cat.png"
                  alt="Кот Deda"
                  className="pointer-events-none h-16 w-16 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
                />
              </div>
            </div>
          </aside>
          <div ref={lessonsWrapRef} className="relative z-[150] mx-auto w-full max-w-[980px] [@media(max-height:980px)]:max-w-[900px]">
            <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 [@media(max-height:980px)]:gap-2 justify-center">
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
                const progressTone = `home-progress-fill--${status ?? 'unknown'}`;

                return (
                  <div key={ep.id} className="relative w-full min-w-0">
                    <Link href={`/study/${ep.id}`} legacyBehavior>
                      <a
                        className={`lesson-card home-lesson-card ${best >= lessonTargetScore ? 'home-lesson-card--complete' : ''} relative w-full aspect-[1/0.8] [@media(max-height:980px)]:aspect-[1/0.68] rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center gap-1 transition-all duration-200 ease-out shadow-[0_10px_20px_rgba(15,23,42,0.12)] ${status !== 'locked' ? 'lesson-card--interactive hover:z-30 hover:border-indigo-300 hover:bg-slate-50' : 'cursor-not-allowed opacity-65'}`}
                        onClick={e => {
                          if (status === 'locked') e.preventDefault();
                        }}
                        aria-disabled={status === 'locked'}
                      >
                        <div className="absolute top-3 left-4 flex flex-col">
                          <span className="home-lesson-title text-[clamp(13px,1.05vw,16px)] font-semibold text-slate-700">Урок {i + 1}</span>
                          <span className="home-lesson-subtitle text-[clamp(11px,0.92vw,14px)] text-slate-500">Изучаем буквы</span>
                        </div>
                        <div className="absolute top-2 right-2 leading-none" aria-hidden="true">
                          {status === 'mastered' && (
                            <span className="text-sm text-emerald-500">✓</span>
                          )}
                          {status === 'current' && (
                            <span className="text-[17px] text-yellow-300 drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]">🐾</span>
                          )}
                          {status === 'almost' && (
                            <span className="inline-block h-[6px] w-[6px] rounded-full bg-slate-400/40 align-middle" />
                          )}
                          {status === 'locked' && (
                            <span className="text-sm text-slate-500/90">🔒</span>
                          )}
                        </div>

                        {/* буквы с транскрипцией */}
                        <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 flex flex-wrap content-center justify-center gap-1.5 sm:gap-2 overflow-visible">
                          {letters.map(ch => {
                            return (
                              <div
                                key={ch}
                                className={`home-lesson-letter home-lesson-letter--${status ?? 'unknown'} flex flex-col items-center ${letterTone} drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]`}
                              >
                                <span className="text-[clamp(1.08rem,1.7vw,2.05rem)] leading-none">{ch}</span>
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
                            <div className="home-progress-bg h-[6px] flex-1 rounded-[4px] bg-slate-200 overflow-hidden">
                              <div
                                className={`home-progress-fill h-full rounded-full transition-all ${progressTone}`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <span className="home-progress-score text-[clamp(10px,0.82vw,11px)] text-slate-500 whitespace-nowrap">{best}/{lessonTargetScore}</span>
                          </div>
                        </div>
                        {isRecommended && <span className="sr-only">Рекомендуемый урок</span>}
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
      <section className="relative z-[170] mt-3 min-[1512px]:mt-4 min-[1700px]:mt-6 [@media(max-height:980px)]:mt-1.5 flex flex-wrap justify-center gap-3 max-w-6xl mx-auto">
        {allLessonsSpecial && (
          <Link href={`/study/${allLessonsSpecial.id}`} legacyBehavior>
            <a
              className={`home-special-btn h-11 min-w-[170px] px-4 rounded-2xl border text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
                allLessonsReady
                  ? 'bg-[#E6ECFF] border-[#c7d5ff] text-[#3B5BDB] shadow-[0_8px_18px_rgba(15,23,42,0.1)]'
                  : 'bg-white border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
              }`}
              onClick={e => {
                if (!allLessonsReady) e.preventDefault();
              }}
              aria-disabled={!allLessonsReady}
              title={!allLessonsReady ? 'Сначала набери минимум 1 очко в каждом уроке' : undefined}
            >
              <span aria-hidden>📚</span>
              <span>{allLessonsSpecial.title.replace(/^⭐\s*/, '')}</span>
            </a>
          </Link>
        )}

        {favoritesSpecial && (
          <Link href={`/study/${favoritesSpecial.id}`} legacyBehavior>
            <a
              className="home-special-btn h-11 min-w-[170px] px-4 rounded-2xl border border-slate-200 bg-transparent text-sm text-[#6B778C] flex items-center justify-center gap-2 transition-all duration-200 hover:bg-[#EEF2F7] hover:text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.1)]"
            >
              <span aria-hidden>⭐</span>
              <span>{favoritesSpecial.title.replace(/^⭐\s*/, '')}</span>
            </a>
          </Link>
        )}

        <button
          ref={phrasesBtnRef}
          type="button"
          className="home-special-btn relative h-11 min-w-[170px] px-4 rounded-2xl border border-slate-200 bg-transparent text-sm flex items-center justify-center gap-2 cursor-not-allowed shadow-[0_8px_18px_rgba(15,23,42,0.1)]"
          aria-disabled="true"
        >
          <span aria-hidden>💬</span>
          <span className="phrases-label">Разговорные фразы</span>
          <span className="premium-soon-badge">👑 скоро</span>
        </button>
      </section>

      </div>
    </main>
  );
}
