'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getSettings } from '@/lib/settings';
import { getEpisodesDataCached, getEpisodesDataSync } from '@/lib/clientContentCache';
import { loadProgressMapCached, getLocalProgress, type ProgressMap } from '@/lib/supabase';
import { playLetterAudio, stopLetterAudioPlayback } from '@/lib/playLetterAudio';

type Ep = { id: string; title: string };

type LessonStatus = 'mastered' | 'almost' | 'current' | 'locked';
type AlphabetLetterStatus = LessonStatus | 'unknown';
const ALPHABET_STATUS_CACHE_KEY = 'deda:alphabet-letter-status-cache:v1';

const GEORGIAN_ALPHABET = [
  'ა', 'ბ', 'გ', 'დ', 'ე', 'ვ', 'ზ', 'თ', 'ი', 'კ', 'ლ',
  'მ', 'ნ', 'ო', 'პ', 'ჟ', 'რ', 'ს', 'ტ', 'უ', 'ფ', 'ქ',
  'ღ', 'ყ', 'შ', 'ჩ', 'ც', 'ძ', 'წ', 'ჭ', 'ხ', 'ჯ', 'ჰ',
];

const letterTranslit: Record<string, string> = {
  'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z', 'თ': 't',
  'ი': 'i', 'კ': "k'", 'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o', 'პ': "p'", 'ჟ': 'zh',
  'რ': 'r', 'ს': 's', 'ტ': "t'", 'უ': 'u', 'ფ': 'p', 'ქ': 'k', 'ღ': 'gh', 'ყ': "q'",
  'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': "ts'", 'ჭ': "ch'", 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h',
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

export default function GlobalAlphabetOverlay() {
  const pathname = usePathname();
  const canAutoOpenAlphabet = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 1440px) and (min-height: 760px)').matches;
  const shouldOpenByDefault = (path: string) =>
    path !== '/' && !path.startsWith('/play/') && canAutoOpenAlphabet();
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [lettersByEp, setLettersByEp] = useState<Record<string, string[]>>({});
  const [lessonTargetScore, setLessonTargetScore] = useState(25);
  const [letterStatusByChar, setLetterStatusByChar] = useState<Record<string, AlphabetLetterStatus>>({});
  const [playingLetter, setPlayingLetter] = useState<string | null>(null);
  const [audioDebug, setAudioDebug] = useState('');
  const [debugAudioSrc, setDebugAudioSrc] = useState('');
  const playingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onToggle = () => {
      if (pathname === '/') return;
      setOpen(v => !v);
    };
    window.addEventListener('deda:toggle-alphabet', onToggle as EventListener);
    return () => window.removeEventListener('deda:toggle-alphabet', onToggle as EventListener);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (playingTimerRef.current !== null) {
        window.clearTimeout(playingTimerRef.current);
        playingTimerRef.current = null;
      }
      stopLetterAudioPlayback();
    };
  }, []);

  useEffect(() => {
    const onProfileMenuOpened = () => {
      setOpen(false);
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
    setOpen(shouldOpenByDefault(pathname));
  }, [pathname]);

  useEffect(() => {
    const onResize = () => {
      if (!canAutoOpenAlphabet()) {
        setOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const isOpenForPage = open && pathname !== '/';
    window.dispatchEvent(
      new CustomEvent('deda:alphabet-overlay-state', {
        detail: { open: isOpenForPage },
      }),
    );
  }, [open, pathname]);

  useEffect(() => {
    if (pathname === '/' || !open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open, pathname]);

  useEffect(() => {
    if (pathname === '/') return;
    let cancelled = false;

    const load = async (forceRefresh = false) => {
      const cachedEpisodes = getEpisodesDataSync();
      setLettersByEp(cachedEpisodes.lettersByEpisode);

      const local = getLocalProgress();
      const localMap: ProgressMap = {};
      for (const row of local) localMap[row.episodeId] = Math.max(localMap[row.episodeId] ?? 0, row.best);
      setProgress(localMap);
      const settings = getSettings();
      setLessonTargetScore(settings.lessonTargetScore);
      try {
        const raw = window.localStorage.getItem(ALPHABET_STATUS_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, AlphabetLetterStatus>;
          if (parsed && typeof parsed === 'object') setLetterStatusByChar(parsed);
        }
      } catch {}

      const [{ episodes, lettersByEpisode }, merged] = await Promise.all([
        getEpisodesDataCached(forceRefresh),
        loadProgressMapCached(forceRefresh),
      ]);
      const refreshedSettings = getSettings();
      const target = refreshedSettings.lessonTargetScore;
      if (cancelled) return;

      const progressMap: ProgressMap = { ...merged };
      setProgress(progressMap);
      setLettersByEp(lettersByEpisode);
      setLessonTargetScore(target);

      const normalEpisodes = episodes.filter(ep => /^ep\d+$/.test(ep.id));
      const unlockedById: Record<string, boolean> = {};
      for (let i = 0; i < normalEpisodes.length; i += 1) {
        const ep = normalEpisodes[i];
        if (i === 0) {
          unlockedById[ep.id] = true;
          continue;
        }
        const prevId = normalEpisodes[i - 1].id;
        unlockedById[ep.id] = (progressMap[prevId] ?? 0) > 0;
      }

      const recommendedEpId = normalEpisodes
        .filter(ep => unlockedById[ep.id] && (progressMap[ep.id] ?? 0) < target)
        .sort((a, b) => {
          const aBest = progressMap[a.id] ?? 0;
          const bBest = progressMap[b.id] ?? 0;
          if (aBest !== bBest) return aBest - bBest;
          const aNum = Number(a.id.replace('ep', ''));
          const bNum = Number(b.id.replace('ep', ''));
          return aNum - bNum;
        })[0]?.id;

      const statusById: Record<string, LessonStatus> = {};
      for (const ep of normalEpisodes) {
        const best = progressMap[ep.id] ?? 0;
        if (!unlockedById[ep.id]) statusById[ep.id] = 'locked';
        else if (best >= target) statusById[ep.id] = 'mastered';
        else statusById[ep.id] = ep.id === recommendedEpId ? 'current' : 'almost';
      }

      const byChar: Record<string, AlphabetLetterStatus> = {};
      for (const ep of normalEpisodes) {
        const epStatus = statusById[ep.id] ?? 'locked';
        const lettersForEp = lettersByEpisode[ep.id] ?? [];
        for (const ch of lettersForEp) {
          if (!byChar[ch]) byChar[ch] = epStatus;
        }
      }
      setLetterStatusByChar(byChar);
      try {
        window.localStorage.setItem(ALPHABET_STATUS_CACHE_KEY, JSON.stringify(byChar));
      } catch {}
    };

    load();
    const onRefresh = () => {
      load(true);
    };
    window.addEventListener('deda:progress-updated' as any, onRefresh);
    window.addEventListener('deda:settings-updated' as any, onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener('deda:progress-updated' as any, onRefresh);
      window.removeEventListener('deda:settings-updated' as any, onRefresh);
    };
  }, [pathname]);

  const speakLetter = (letter: string) => {
    if (typeof window === 'undefined') return;
    setDebugAudioSrc(geLetterAudioMap[letter] ?? '');
    setPlayingLetter(letter);
    if (playingTimerRef.current !== null) {
      window.clearTimeout(playingTimerRef.current);
      playingTimerRef.current = null;
    }
    const finish = () => {
      if (playingTimerRef.current !== null) {
        window.clearTimeout(playingTimerRef.current);
        playingTimerRef.current = null;
      }
      setPlayingLetter(prev => (prev === letter ? null : prev));
    };

    void playLetterAudio({
      audioSrc: geLetterAudioMap[letter],
      fallbackText: letter,
      onDebug: setAudioDebug,
      onEnd: finish,
      onError: finish,
    });

    playingTimerRef.current = window.setTimeout(finish, 1600);
  };

  if (pathname === '/') return null;

  return (
    <div
      ref={overlayRef}
      className={`block fixed left-2 sm:left-3 md:left-4 top-[68px] z-[140] w-[clamp(184px,31vw,244px)] transition-all duration-200 ease-out ${
        open
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 -translate-y-1 scale-[0.98] pointer-events-none select-none'
      }`}
      aria-hidden={!open}
    >
      <div className="home-alphabet-panel max-h-[calc(100dvh-102px)] overflow-y-auto rounded-[clamp(20px,3vw,30px)] border border-slate-200/75 bg-gradient-to-b from-[#f6f8fe]/88 via-[#f1f4fc]/86 to-[#edf1f9]/84 p-[clamp(7px,1.2vw,10px)] shadow-[0_6px_14px_rgba(15,23,42,0.09)]">
        <div className="flex items-center justify-between gap-2">
          <h3 className="home-alphabet-title text-sm font-semibold tracking-[-0.01em] text-slate-700">ანბანი</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="home-alphabet-close h-6 w-6 rounded-md text-xs transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--menu-focus)] focus-visible:outline-offset-2"
            aria-label="Скрыть алфавит"
            title="Скрыть алфавит"
          >
            ✕
          </button>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[clamp(9px,1.55vw,11px)] text-[var(--text-secondary)]">
          <span className="relative inline-flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7C8CFF] opacity-70" />
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
              className={`home-alphabet-key rounded-lg border border-slate-200/75 bg-white/90 py-[1px] text-center shadow-sm hover:bg-slate-50 transition-all ${
                playingLetter === ch ? 'home-alphabet-key--active' : ''
              }`}
              title={`Озвучить букву ${ch}`}
              aria-label={`Озвучить букву ${ch}`}
            >
              <div className="home-alphabet-letter text-[clamp(14px,2.7vw,19px)] leading-none text-black">{ch}</div>
              <div className="home-alphabet-translit mt-0 text-[clamp(8px,1.5vw,10px)] leading-none text-slate-500">{letterTranslit[ch] ?? ''}</div>
            </button>
          ))}
        </div>
        {audioDebug && (
          <div className="mt-2 text-[10px] leading-tight text-slate-500">
            {audioDebug}
          </div>
        )}
        {debugAudioSrc && (
          <div className="mt-2">
            <audio controls playsInline preload="metadata" src={debugAudioSrc} className="h-8 w-full" />
          </div>
        )}
      </div>
    </div>
  );
}
