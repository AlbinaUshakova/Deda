'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { getSettings } from '@/lib/settings';
import { getEpisodesDataCached, getEpisodesDataSync } from '@/lib/clientContentCache';
import {
  loadProgressMapCached,
  getLocalProgress,
  type ProgressMap,
} from '@/lib/supabase';

type Ep = { id: string; title: string; best?: number };
type LessonStatus = 'mastered' | 'almost' | 'current' | 'locked';
type AlphabetLetterStatus = LessonStatus | 'unknown';
const ALPHABET_STATUS_CACHE_KEY = 'deda:alphabet-letter-status-cache:v1';
const LOCKED_LESSON_TOOLTIP_DELAY_MS = 240;

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
  mastered: 'text-[var(--progress-good)]',
  almost: 'text-[var(--progress-low)]',
  current: 'text-[var(--progress-current)]',
  locked: 'text-[var(--text-tertiary)]',
  unknown: 'text-[var(--ui-accent)]',
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

export default function HomePage() {
  const [eps, setEps] = useState<Ep[]>([]);
  const [showAlphabet, setShowAlphabet] = useState(false);
  const [alphabetOverlapsLessons, setAlphabetOverlapsLessons] = useState(false);
  const alphabetRef = useRef<HTMLElement | null>(null);
  const lessonsWrapRef = useRef<HTMLDivElement | null>(null);
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [audioError, setAudioError] = useState('');
  const [progress, setProgress] = useState<ProgressMap>({});
  const [lettersByEp, setLettersByEp] = useState<Record<string, string[]>>({});
  const [lessonTargetScore, setLessonTargetScore] = useState(25);
  const [lockedLessonTooltipEpId, setLockedLessonTooltipEpId] = useState<string | null>(null);
  const [cachedLetterStatusByChar, setCachedLetterStatusByChar] = useState<Record<string, AlphabetLetterStatus>>({});
  const alphabetUserToggledRef = useRef(false);
  const lockedTooltipTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const init = async () => {
      // 1) Быстрый клиентский prefill из local cache (после монтирования, без hydration mismatch)
      const cachedEpisodes = getEpisodesDataSync();
      setEps(cachedEpisodes.episodes as Ep[]);
      setLettersByEp(cachedEpisodes.lettersByEpisode);

      const local = getLocalProgress();
      const localMap: ProgressMap = {};
      for (const row of local) {
        localMap[row.episodeId] = Math.max(localMap[row.episodeId] ?? 0, row.best);
      }
      setProgress(localMap);

      const settings = getSettings();
      setLessonTargetScore(settings.lessonTargetScore);
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
        const { episodes, lettersByEpisode } = await getEpisodesDataCached();
        setEps(episodes as Ep[]);
        setLettersByEp(lettersByEpisode);
      } catch (e) {
        console.error('Failed to load episodes API, fallback to local storage', e);
      }

      // тянем merged-прогресс (локалка+сервер) и мёрджим поверх текущего
      try {
        const merged = await loadProgressMapCached();
        setProgress(merged);
      } catch (e) {
        console.error('Failed to load progress map', e);
      }
    };

    init();

    const onUpd = async () => {
      try {
        const merged = await loadProgressMapCached(true);
        setProgress(merged);
      } catch (e) {
        console.error('Failed to refresh progress map', e);
      }
    };

    if (typeof window !== 'undefined') {
      const onSettingsUpd = () => {
        const settings = getSettings();
        setLessonTargetScore(settings.lessonTargetScore);
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
    return () => {
      if (lockedTooltipTimerRef.current !== null) {
        window.clearTimeout(lockedTooltipTimerRef.current);
        lockedTooltipTimerRef.current = null;
      }
    };
  }, []);

  const hideLockedLessonTooltip = () => {
    if (lockedTooltipTimerRef.current !== null) {
      window.clearTimeout(lockedTooltipTimerRef.current);
      lockedTooltipTimerRef.current = null;
    }
    setLockedLessonTooltipEpId(null);
  };

  const scheduleLockedLessonTooltip = (episodeId: string) => {
    if (lockedTooltipTimerRef.current !== null) {
      window.clearTimeout(lockedTooltipTimerRef.current);
      lockedTooltipTimerRef.current = null;
    }
    lockedTooltipTimerRef.current = window.setTimeout(() => {
      setLockedLessonTooltipEpId(episodeId);
      lockedTooltipTimerRef.current = null;
    }, LOCKED_LESSON_TOOLTIP_DELAY_MS);
  };

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
      if (!alphabetUserToggledRef.current) {
        setShowAlphabet(canFitWithoutOverlap);
      }
    };

    updateAlphabetLayoutMode();
    window.addEventListener('resize', updateAlphabetLayoutMode);
    return () => window.removeEventListener('resize', updateAlphabetLayoutMode);
  }, [eps.length, Object.keys(lettersByEp).length]);

  useEffect(() => {
    const onToggleAlphabet = () => {
      alphabetUserToggledRef.current = true;
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
  const phrasesSpecial = specials.find(ep => ep.id === 'phrases');
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
      className="min-h-screen bg-[var(--app-bg)] px-[clamp(20px,4.8vw,36px)] [@media(max-width:900px)]:px-[clamp(28px,8vw,44px)] [@media(max-width:700px)]:px-[clamp(24px,9vw,40px)] pt-3 pb-1 min-[1920px]:pt-6 min-[1920px]:pb-2 [@media(max-height:980px)]:pt-2 [@media(max-height:980px)]:pb-1 relative overflow-hidden flex flex-col"
    >
      <div className="relative mx-auto w-full flex-1 flex flex-col justify-start pb-[clamp(32px,4.5vh,40px)]">
      {/* алфавит + сетка эпизодов */}
      <section className="mt-16 min-[1512px]:mt-16 min-[1700px]:mt-20 min-[1700px]:pl-10 min-[2200px]:pl-12 [@media(max-height:980px)]:mt-10">
        <div className="relative mx-auto w-full">
          <aside ref={alphabetRef} className={`block fixed left-2 sm:left-3 md:left-4 top-[68px] ${alphabetOverlapsLessons ? 'z-[220]' : 'z-[140]'} h-fit w-[clamp(184px,31vw,244px)] pointer-events-none`}>
            <div
              className={`home-alphabet-panel max-h-[calc(100dvh-102px)] overflow-y-auto rounded-[clamp(20px,3vw,30px)] border border-slate-200/75 bg-gradient-to-b from-[#f6f8fe]/88 via-[#f1f4fc]/86 to-[#edf1f9]/84 p-[clamp(7px,1.2vw,10px)] shadow-[0_6px_14px_rgba(15,23,42,0.09)] transition-all duration-200 ${showAlphabet ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none select-none'}`}
              aria-hidden={!showAlphabet}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="home-alphabet-title text-sm font-semibold tracking-[-0.01em] text-slate-700">ანბანი</h3>
                <button
                  type="button"
                  onClick={() => {
                    alphabetUserToggledRef.current = true;
                    setShowAlphabet(v => !v);
                  }}
                  className="home-alphabet-close h-6 w-6 rounded-md text-xs transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--menu-focus)] focus-visible:outline-offset-2"
                  aria-label="Скрыть алфавит"
                  title="Скрыть алфавит"
                >
                  ✕
                </button>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[clamp(9px,1.55vw,11px)] text-slate-500">
                <span className="relative inline-flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7C8CFF] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7C8CFF]" />
                </span>
                <span>Нажми на букву и послушай</span>
              </div>
              <div className="mt-2 grid grid-cols-6 gap-x-[clamp(3px,0.8vw,7px)] gap-y-[clamp(3px,0.8vw,6px)]">
                {GEORGIAN_ALPHABET.map(ch => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => speakLetter(ch)}
                    className="home-alphabet-key cursor-pointer rounded-lg border border-slate-200 bg-white py-[1px] text-center shadow-sm hover:bg-slate-50 transition-colors"
                    title={`Озвучить букву ${ch}`}
                    aria-label={`Озвучить букву ${ch}`}
                  >
                    <div className="home-alphabet-letter text-[clamp(14px,2.7vw,19px)] leading-none text-black">{ch}</div>
                    <div className="home-alphabet-translit mt-0 text-[clamp(8px,1.5vw,10px)] leading-none text-slate-500">
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
          <div ref={lessonsWrapRef} className="relative z-[150] mx-auto w-[min(88vw,980px)] [@media(max-width:900px)]:w-[min(84vw,980px)] [@media(max-width:700px)]:w-[min(82vw,980px)] [@media(max-height:980px)]:w-[min(88vw,900px)] [@media(max-width:900px)_and_(max-height:980px)]:w-[min(84vw,900px)] [@media(max-width:700px)_and_(max-height:980px)]:w-[min(82vw,900px)]">
            <div className="-mt-3 md:-mt-5 mb-4 [@media(max-height:980px)]:-mt-3 [@media(max-height:980px)]:mb-3 flex items-center justify-start gap-1 pl-[clamp(72px,10.5vw,148px)]">
              <div className="inline-flex h-[clamp(28px,3.1vw,40px)] w-[clamp(28px,3.1vw,40px)] items-center justify-center p-0">
                <img
                  src="/images/deda-cat.png"
                  alt="Deda cat"
                  className="h-[clamp(28px,3.1vw,40px)] w-[clamp(28px,3.1vw,40px)] shrink-0 object-contain"
                />
              </div>

              <div className="alphabet-writing-area min-w-0 -ml-1 w-[72%] max-w-[72%]">
                <div className="alphabet-writing-row w-full">
                  {GEORGIAN_ALPHABET.map(ch => (
                    <span
                      key={`progress-alpha-${ch}`}
                      className={`alphabet-writing-letter text-[clamp(11px,1.55vw,19px)] leading-none ${alphabetLetterColorByStatus[letterStatusByChar[ch] ?? 'unknown']}`}
                      aria-label={`Буква ${ch}`}
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 [@media(max-width:480px)]:grid-cols-1 gap-x-[clamp(10px,1.35vw,20px)] gap-y-[clamp(8px,1vw,15px)] [@media(max-height:980px)]:gap-y-3 justify-center">
              {normalEpisodes.map((ep, i) => {
                const best = progress[ep.id] ?? 0;
                const letters = lettersByEp[ep.id] ?? [];
                const progressRatio = Math.min(best / lessonTargetScore, 1);
                const progressPercent = Math.round(progressRatio * 100);
                const status = statusById[ep.id];
                const isRecommended = status === 'current';
                const progressTone = `home-progress-fill--${status ?? 'unknown'}`;

                return (
                  <div key={ep.id} className="relative w-full min-w-0 [@media(max-width:639px)]:mx-auto [@media(max-width:639px)]:max-w-[420px]">
                    <Link href={`/study/${ep.id}`} legacyBehavior>
                      <a
                        className={`lesson-card home-lesson-card ${best >= lessonTargetScore ? 'home-lesson-card--complete' : ''} ${status === 'locked' ? 'home-lesson-card--locked' : ''} relative grid w-full aspect-[2/1] grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl bg-white border border-slate-200 px-[clamp(10px,1.4vw,18px)] pt-[clamp(6px,0.8vw,10px)] pb-[clamp(10px,1.2vw,14px)] transition-all duration-200 ease-out shadow-[0_8px_18px_rgba(15,23,42,0.09)] ${status !== 'locked' ? 'lesson-card--interactive hover:z-30 hover:border-slate-300 hover:bg-[#fafbfd]' : 'cursor-not-allowed'}`}
                        onMouseEnter={() => {
                          if (status !== 'locked') return;
                          scheduleLockedLessonTooltip(ep.id);
                        }}
                        onMouseLeave={() => {
                          if (status !== 'locked') return;
                          hideLockedLessonTooltip();
                        }}
                        onFocus={() => {
                          if (status !== 'locked') return;
                          scheduleLockedLessonTooltip(ep.id);
                        }}
                        onBlur={() => {
                          if (status !== 'locked') return;
                          hideLockedLessonTooltip();
                        }}
                        onClick={e => {
                          if (status === 'locked') {
                            e.preventDefault();
                            if (lockedTooltipTimerRef.current !== null) {
                              window.clearTimeout(lockedTooltipTimerRef.current);
                              lockedTooltipTimerRef.current = null;
                            }
                            setLockedLessonTooltipEpId(ep.id);
                          }
                        }}
                        aria-disabled={status === 'locked'}
                      >
                        <div className="z-10 row-start-1 justify-self-start self-start pl-3 -mt-[1px] text-left">
                          <span className="home-lesson-title text-[13px] [@media(max-width:900px)]:text-[11px] [@media(max-width:560px)]:text-[10px] font-normal text-slate-700">Урок {i + 1}</span>
                        </div>
                        <div className="home-lesson-status-icon" aria-hidden="true">
                          {status === 'mastered' && (
                            <span className="home-lesson-status home-lesson-status--mastered">✓</span>
                          )}
                          {status === 'current' && (
                            <span className="home-lesson-status home-lesson-status--current">🐾</span>
                          )}
                          {status === 'almost' && (
                            <span className="home-lesson-status home-lesson-status--almost">•</span>
                          )}
                          {status === 'locked' && (
                            <span
                              className={`home-lesson-status home-lesson-status--locked transition-all duration-150 ${
                                lockedLessonTooltipEpId === ep.id ? 'opacity-100 brightness-110' : 'opacity-90'
                              }`}
                            >
                              🔒
                            </span>
                          )}
                        </div>

                        <div className="row-start-2 mx-auto flex h-full min-h-0 w-full -translate-y-[8px] [@media(max-width:1200px)]:-translate-y-[4px] [@media(max-width:900px)]:translate-y-0 flex-wrap content-center justify-center gap-0.5 sm:gap-1 overflow-visible px-2 py-1.5 text-center">
                          {letters.map(ch => {
                            return (
                              <div
                                key={ch}
                                className={`home-lesson-letter home-lesson-letter--${status ?? 'unknown'} flex flex-col items-center`}
                              >
                                <span className="block text-[32px] min-[1400px]:text-[36px] [@media(max-width:1200px)]:text-[22px] [@media(max-width:900px)]:text-[18px] [@media(max-width:560px)]:text-[14px] leading-[1.3] tracking-[0.015em] pb-[3px]">{ch}</span>
                              </div>
                            );
                          })}
                          {!letters.length && (
                            <span className="text-xs text-slate-400">
                              без новых букв
                            </span>
                          )}
                        </div>

                        <div className="z-10 row-start-3 justify-self-start self-end w-[40%] max-w-[144px] min-w-[96px] [@media(max-width:480px)]:w-[34%] [@media(max-width:480px)]:max-w-[108px] [@media(max-width:480px)]:min-w-[72px] translate-y-[6px] [@media(max-width:480px)]:translate-y-[4px]">
                          <div className="flex items-center gap-2 [@media(max-width:480px)]:gap-1">
                            <div className="home-progress-bg h-[4px] [@media(max-width:480px)]:h-[3px] flex-1 rounded-[4px] bg-slate-200 overflow-hidden">
                              <div
                                className={`home-progress-fill h-full rounded-full transition-all ${progressTone}`}
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <span className="home-progress-score text-[clamp(10px,1vw,12px)] [@media(max-width:480px)]:hidden text-slate-500 whitespace-nowrap">{best}/{lessonTargetScore}</span>
                          </div>
                        </div>
                        {status === 'locked' && lockedLessonTooltipEpId === ep.id && (
                          <div
                            className="locked-lesson-tooltip pointer-events-none absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 text-center"
                          >
                            <span
                              aria-hidden="true"
                              className="locked-lesson-tooltip-arrow absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 -translate-y-[5px] border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent"
                            />
                            <span>
                              Наберите <span className="font-semibold text-[var(--progress-current)]">1 очко</span>
                              <br />
                              в предыдущем уроке,
                              <br />
                              чтобы открыть этот.
                            </span>
                          </div>
                        )}
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
      <section className="relative z-[170] mt-10 min-[1512px]:mt-11 min-[1700px]:mt-12 [@media(max-height:980px)]:mt-8 flex flex-wrap [@media(max-width:480px)]:flex-col [@media(max-width:480px)]:items-center justify-center gap-2.5 [@media(max-width:720px)]:gap-2 max-w-6xl mx-auto">
        {allLessonsSpecial && (
          <Link href={`/study/${allLessonsSpecial.id}`} legacyBehavior>
            <a
              className={`home-special-btn h-9 min-w-[152px] px-3 text-[12px] [@media(max-width:900px)]:h-8 [@media(max-width:900px)]:min-w-[136px] [@media(max-width:900px)]:px-2.5 [@media(max-width:900px)]:text-[11px] [@media(max-width:720px)]:h-7.5 [@media(max-width:720px)]:min-w-[120px] [@media(max-width:720px)]:px-2 [@media(max-width:720px)]:text-[10px] [@media(max-width:480px)]:min-w-0 [@media(max-width:480px)]:w-[min(92vw,300px)] rounded-2xl border flex items-center justify-center gap-1.5 transition-all duration-200 ${
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
              <span>{allLessonsSpecial.title.replace(/^⭐\s*/, '')}</span>
              {!allLessonsReady && <span aria-hidden>🔒</span>}
            </a>
          </Link>
        )}

        {favoritesSpecial && (
          <Link href={`/study/${favoritesSpecial.id}`} legacyBehavior>
            <a
              className="home-special-btn h-9 min-w-[152px] px-3 text-[12px] [@media(max-width:900px)]:h-8 [@media(max-width:900px)]:min-w-[136px] [@media(max-width:900px)]:px-2.5 [@media(max-width:900px)]:text-[11px] [@media(max-width:720px)]:h-7.5 [@media(max-width:720px)]:min-w-[120px] [@media(max-width:720px)]:px-2 [@media(max-width:720px)]:text-[10px] [@media(max-width:480px)]:min-w-0 [@media(max-width:480px)]:w-[min(92vw,300px)] rounded-2xl border border-slate-200 bg-transparent text-[var(--text-secondary)] flex items-center justify-center gap-1.5 transition-all duration-200 hover:bg-[var(--button-hover)] hover:text-[var(--text-primary)] shadow-[0_8px_18px_rgba(15,23,42,0.1)]"
            >
              <span aria-hidden>⭐</span>
              <span>{favoritesSpecial.title.replace(/^⭐\s*/, '')}</span>
            </a>
          </Link>
        )}

        {phrasesSpecial && (
          <Link href={`/study/${phrasesSpecial.id}`} legacyBehavior>
            <a
              className="home-special-btn h-9 min-w-[152px] px-3 text-[12px] [@media(max-width:900px)]:h-8 [@media(max-width:900px)]:min-w-[136px] [@media(max-width:900px)]:px-2.5 [@media(max-width:900px)]:text-[11px] [@media(max-width:720px)]:h-7.5 [@media(max-width:720px)]:min-w-[120px] [@media(max-width:720px)]:px-2 [@media(max-width:720px)]:text-[10px] [@media(max-width:480px)]:min-w-0 [@media(max-width:480px)]:w-[min(92vw,300px)] rounded-2xl border border-slate-200 bg-transparent text-[var(--text-secondary)] flex items-center justify-center gap-1.5 transition-all duration-200 hover:bg-[var(--button-hover)] hover:text-[var(--text-primary)] shadow-[0_8px_18px_rgba(15,23,42,0.1)]"
            >
              <span aria-hidden>💬</span>
              <span className="phrases-label">{phrasesSpecial.title.replace(/^💬\s*/, '')}</span>
            </a>
          </Link>
        )}
      </section>

      </div>
    </main>
  );
}
