'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getSettings } from '@/lib/settings';
import { loadProgressMap, getLocalProgress, type ProgressMap } from '@/lib/supabase';

type Ep = { id: string; title: string };
type EpisodesApiResponse = {
  ok: boolean;
  episodes?: Ep[];
  lettersByEpisode?: Record<string, string[]>;
};

type LessonStatus = 'mastered' | 'almost' | 'current' | 'locked';
type AlphabetLetterStatus = LessonStatus | 'unknown';

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
  mastered: 'text-emerald-300',
  almost: 'text-orange-300',
  current: 'text-yellow-300',
  locked: 'text-slate-400',
  unknown: 'text-amber-300/90',
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

export default function GlobalAlphabetOverlay() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<ProgressMap>(() => {
    if (typeof window === 'undefined') return {};
    const local = getLocalProgress();
    const map: ProgressMap = {};
    for (const row of local) map[row.episodeId] = Math.max(map[row.episodeId] ?? 0, row.best);
    return map;
  });
  const [lettersByEp, setLettersByEp] = useState<Record<string, string[]>>({});
  const [lessonTargetScore, setLessonTargetScore] = useState(() => {
    if (typeof window === 'undefined') return 50;
    return getSettings().lessonTargetScore;
  });
  const [letterStatusByChar, setLetterStatusByChar] = useState<Record<string, AlphabetLetterStatus>>({});

  useEffect(() => {
    const onToggle = () => {
      if (pathname === '/') return;
      setOpen(v => !v);
    };
    window.addEventListener('deda:toggle-alphabet', onToggle as EventListener);
    return () => window.removeEventListener('deda:toggle-alphabet', onToggle as EventListener);
  }, [pathname]);

  useEffect(() => {
    if (pathname === '/') setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const isOpenForPage = open && pathname !== '/';
    window.dispatchEvent(
      new CustomEvent('deda:alphabet-overlay-state', {
        detail: { open: isOpenForPage },
      }),
    );
  }, [open, pathname]);

  useEffect(() => {
    if (!open || pathname === '/') return;
    let cancelled = false;

    const load = async () => {
      const { episodes, lettersByEpisode } = await loadEpisodesData();
      const merged = await loadProgressMap();
      const target = getSettings().lessonTargetScore;
      if (cancelled) return;

      const progressMap: ProgressMap = { ...progress };
      for (const [ep, best] of Object.entries(merged)) {
        progressMap[ep] = Math.max(progressMap[ep] ?? 0, best as number);
      }
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
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, pathname]);

  const speakLetter = (letter: string) => {
    if (typeof window === 'undefined') return;
    const localAudioSrc = geLetterAudioMap[letter];
    if (localAudioSrc) {
      const audio = new Audio(localAudioSrc);
      audio.volume = 1;
      audio.play().catch(() => {});
      return;
    }

    if (!('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(letter);
    const voices = synth.getVoices();
    const geVoice = voices.find(v => v.lang?.toLowerCase().startsWith('ka'));
    if (geVoice) {
      utterance.voice = geVoice;
      utterance.lang = geVoice.lang;
    } else {
      utterance.lang = 'ka-GE';
    }
    utterance.rate = 0.9;
    synth.speak(utterance);
  };

  if (!open || pathname === '/') return null;

  return (
    <div className="fixed left-20 top-[86px] z-[140] w-[224px] xl:w-[246px]">
      <div className="max-h-[calc(100vh-112px)] overflow-y-auto rounded-3xl border border-amber-200/15 bg-gradient-to-b from-[#1a2238]/82 via-[#141d33]/82 to-[#111827]/82 p-3 xl:p-3.5 shadow-[0_8px_18px_rgba(0,0,0,0.32)]">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-[-0.01em] text-amber-100/95">🐱 Ანბანი</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-6 w-6 rounded-md border border-amber-200/30 bg-amber-300/10 text-xs text-amber-100/85 hover:bg-amber-300/20 hover:text-amber-50 transition-colors"
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
              className="rounded-lg border border-amber-100/15 bg-[#0f1a31]/70 py-0.5 text-center hover:bg-[#152544]/80 transition-colors"
              title={`Озвучить букву ${ch}`}
              aria-label={`Озвучить букву ${ch}`}
            >
              <div className={`text-[19px] leading-none ${alphabetLetterColorByStatus[letterStatusByChar[ch] ?? 'unknown']}`}>{ch}</div>
              <div className="mt-0.5 text-[10px] leading-none text-amber-50/55">{letterTranslit[ch] ?? ''}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
