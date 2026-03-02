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

export default function HomePage() {
  const [eps, setEps] = useState<Ep[]>([]);
  const [showCatHint, setShowCatHint] = useState(false);
  const [showAlphabet, setShowAlphabet] = useState(false);
  const [ttsVoices, setTtsVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [audioError, setAudioError] = useState('');
  const [progress, setProgress] = useState<ProgressMap>(() => {
    // стартуем сразу с локального прогресса, без ожидания сети
    if (typeof window === 'undefined') return {};

    const local = getLocalProgress();
    const map: ProgressMap = {};
    for (const row of local) {
      map[row.episodeId] = Math.max(map[row.episodeId] ?? 0, row.best);
    }
    return map;
  });
  const [lettersByEp, setLettersByEp] = useState<Record<string, string[]>>({});
  const [lessonTargetScore, setLessonTargetScore] = useState(() => {
    if (typeof window === 'undefined') return 50;
    return getSettings().lessonTargetScore;
  });

  useEffect(() => {
    const init = async () => {
      const { episodes, lettersByEpisode } = await loadEpisodesData();
      setEps(episodes);
      setLettersByEp(lettersByEpisode);
      setLessonTargetScore(getSettings().lessonTargetScore);

      // тянем merged-прогресс (локалка+сервер) и мёрджим поверх текущего
      const merged = await loadProgressMap();
      setProgress(prev => {
        const next: ProgressMap = { ...prev };
        for (const [ep, best] of Object.entries(merged)) {
          const current = next[ep] ?? 0;
          next[ep] = Math.max(current, best as number);
        }
        return next;
      });
    };

    init();

    const onUpd = async () => {
      const merged = await loadProgressMap();
      setProgress(prev => {
        const next: ProgressMap = { ...prev };
        for (const [ep, best] of Object.entries(merged)) {
          const current = next[ep] ?? 0;
          next[ep] = Math.max(current, best as number);
        }
        return next;
      });
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
  const letterStatusByChar: Record<string, AlphabetLetterStatus> = {};
  for (const ep of normalEpisodes) {
    const epStatus = statusById[ep.id] ?? 'locked';
    const letters = lettersByEp[ep.id] ?? [];
    for (const ch of letters) {
      if (!letterStatusByChar[ch]) {
        letterStatusByChar[ch] = epStatus;
      }
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-3 sm:px-6 py-8 relative overflow-hidden">
      {/* алфавит + сетка эпизодов */}
      <section className="mt-2">
        <div className="relative mx-auto max-w-[1280px]">
          {showAlphabet && (
          <aside className="hidden min-[1150px]:block absolute left-[-196px] top-0 z-20 w-[260px]">
            <div className="origin-top-left scale-[1.2] rounded-3xl border border-amber-200/20 bg-gradient-to-b from-[#1a2238]/95 via-[#141d33]/95 to-[#111827]/95 p-3 shadow-[0_14px_24px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold tracking-[-0.01em] text-amber-100/95">🐱 Ანბანი</h3>
                <button
                  type="button"
                  onClick={() => setShowAlphabet(v => !v)}
                  className="h-6 w-6 rounded-md border border-amber-200/30 bg-amber-300/10 text-xs text-amber-100/85 hover:bg-amber-300/20 hover:text-amber-50 transition-colors"
                  aria-label="Скрыть алфавит"
                  title="Скрыть алфавит"
                >
                  ✕
                </button>
              </div>
              <div className="mt-3 grid grid-cols-6 gap-x-2 gap-y-2">
                {GEORGIAN_ALPHABET.map(ch => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => speakLetter(ch)}
                    className="rounded-lg border border-amber-100/15 bg-[#0f1a31]/70 py-1 text-center hover:bg-[#152544]/80 transition-colors"
                    title={`Озвучить букву ${ch}`}
                    aria-label={`Озвучить букву ${ch}`}
                  >
                    <div className={`text-xl leading-none ${alphabetLetterColorByStatus[letterStatusByChar[ch] ?? 'unknown']}`}>{ch}</div>
                    <div className="mt-0.5 text-[10px] leading-none text-amber-50/55">
                      {geLetterToTranslit(ch)}
                    </div>
                  </button>
                ))}
              </div>
              {audioError && (
                <div className="mt-2 text-[11px] text-red-300/85">
                  {audioError}
                </div>
              )}
            </div>
          </aside>
          )}
          <div className="mx-auto w-full max-w-5xl">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 justify-items-center">
          {normalEpisodes.map((ep, i) => {
            const best = progress[ep.id] ?? 0;
            const letters = lettersByEp[ep.id] ?? [];
            const progressRatio = Math.min(best / lessonTargetScore, 1);
            const progressPercent = Math.round(progressRatio * 100);
            const status = statusById[ep.id];
            const isRecommended = status === 'current';
            const letterTone =
              status === 'mastered'
                ? 'text-emerald-300'
                : status === 'almost'
                  ? 'text-orange-300'
                  : status === 'current'
                    ? 'text-yellow-300'
                    : 'text-slate-400';
            const translitTone =
              status === 'mastered'
                ? 'text-emerald-200/75'
                : status === 'almost'
                  ? 'text-orange-200/70'
                  : status === 'current'
                    ? 'text-yellow-200/75'
                    : 'text-slate-300/55';
            const progressTone =
              status === 'mastered'
                ? 'bg-emerald-400/90'
                : status === 'almost'
                  ? 'bg-orange-300/90'
                  : status === 'current'
                    ? 'bg-yellow-200/70'
                    : 'bg-slate-600/80';

            return (
              <div key={ep.id} className="relative w-full max-w-[340px]">
                <Link href={`/study/${ep.id}`} legacyBehavior>
                  <a
                    className={`lesson-card relative w-full aspect-square rounded-2xl bg-slate-900 border border-white/10 flex flex-col items-center justify-center gap-1 transition-all duration-200 ease-out shadow-[0_10px_20px_rgba(0,0,0,0.45)] ${status !== 'locked' ? 'lesson-card--interactive hover:z-30 hover:border-blue-400/70 hover:bg-slate-900/80' : 'cursor-not-allowed opacity-65'}`}
                    onClick={e => {
                      if (status === 'locked') e.preventDefault();
                    }}
                    aria-disabled={status === 'locked'}
                  >
                  <div className="absolute top-3 left-4 flex flex-col">
                    <span className="text-lg font-semibold text-white/85">Урок {i + 1}</span>
                    <span className="text-sm text-white/60">Изучаем новые буквы</span>
                  </div>
                  {isRecommended && (
                    <div className="absolute top-3 right-3 rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-0.5 text-[10px] font-semibold text-amber-100/90">
                      Рекомендуем
                    </div>
                  )}

                  {/* буквы с транскрипцией */}
                  <div className="flex flex-wrap justify-center gap-2 mb-1 min-h-[2.2rem]">
                    {letters.map(ch => {
                      const tr = geLetterToTranslit(ch);
                      return (
                        <div
                          key={ch}
                          className={`flex flex-col items-center ${letterTone} drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]`}
                        >
                          <span className="text-3xl leading-tight">{ch}</span>
                          {tr && (
                            <span className={`text-sm ${translitTone} leading-tight mt-1 tracking-wide`}>
                              {tr}
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {!letters.length && (
                      <span className="text-xs text-neutral-500">
                        без новых букв
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 left-4 w-[42%] max-w-[160px]">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${progressTone}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-white/55 whitespace-nowrap">{best}/{lessonTargetScore}</span>
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
      <section className="mt-6 flex flex-wrap justify-center gap-4 max-w-5xl mx-auto">
        {specials.map(ep => {
          const isFav = ep.id === 'favorites';
          const cleanTitle = ep.title.replace(/^⭐\s*/, '');
          const isAllLessons = ep.id === 'all';
          const isDisabled = isAllLessons && !allLessonsReady;

          return (
            <Link key={ep.id} href={`/study/${ep.id}`} legacyBehavior>
              <a
                className={`w-[180px] px-4 py-3 rounded-2xl bg-slate-900 border border-white/10 text-sm text-neutral-100 flex items-center justify-center gap-2 transition-colors shadow-lg ${isDisabled ? 'cursor-not-allowed opacity-50' : 'hover:border-blue-400/70 hover:bg-slate-900/80'}`}
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

      {/* кот Deda слева у поля */}
      <div
        className="group/cat hidden min-[1150px]:block absolute bottom-8 left-[14%] z-10"
        onMouseEnter={() => setShowCatHint(true)}
        onMouseLeave={() => setShowCatHint(false)}
        onClick={() => {
          const meow = new Audio('/sounds/meow.mp3');
          meow.volume = 0.5;
          meow.play().catch(() => { });
        }}
        style={{ cursor: 'pointer' }}
      >
        <div
          className={`pointer-events-none absolute bottom-[calc(100%-40px)] left-[12%] -translate-x-1/2 w-[332px] z-30 transition-all ${showCatHint ? 'opacity-90 group-hover/cat:opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
        >
          <div className="relative w-[357px]">
            <svg viewBox="0 0 320 220" className="w-full h-auto drop-shadow-[0_12px_20px_rgba(0,0,0,0.35)]">
              <path
                d="M70 170 C35 170, 20 145, 30 120 C10 105, 18 72, 50 68 C62 40, 98 30, 122 48 C145 20, 190 20, 212 50 C245 40, 275 58, 280 88 C305 98, 312 128, 292 148 C282 162, 262 170, 240 170 C220 186, 96 186, 70 170 Z"
                fill="rgba(255,255,255,0.85)"
                stroke="#334155"
                strokeWidth="3"
                strokeLinejoin="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center px-12 translate-y-2 text-[18px] leading-snug text-center font-semibold tracking-tight text-slate-900">
              Урок за уроком — и ты читаешь по-грузински 😺<br />
              წავიდეთ!
            </div>
          </div>
        </div>
        <img
          src="/images/deda-cat.png"
          alt="Кот Deda, читает книгу"
          className="w-[320px] drop-shadow-[0_12px_30px_rgba(0,0,0,0.6)] animate-cloud"
        />
      </div>
    </main>
  );
}
