'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listEpisodes, loadNewLettersPerEpisode } from '@/lib/content';
import { getSettings } from '@/lib/settings';
import {
  loadProgressMap,
  getLocalProgress,
  type ProgressMap,
} from '@/lib/supabase';

type Ep = { id: string; title: string; best?: number };
type LessonStatus = 'mastered' | 'almost' | 'current' | 'locked';

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

function geLetterToTranslit(ch: string): string {
  return letterTranslit[ch] ?? '';
}

export default function HomePage() {
  const [eps, setEps] = useState<Ep[]>([]);
  const [showCatHint, setShowCatHint] = useState(false);
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
      const data = await listEpisodes();
      setEps(data);

      const letters = await loadNewLettersPerEpisode();
      setLettersByEp(letters);
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

  return (
    <main className="min-h-screen bg-slate-950 px-3 sm:px-6 py-8 relative overflow-hidden">
      {/* сетка эпизодов */}
      <section className="max-w-3xl mx-auto mt-2">
        <div className="grid grid-cols-3 gap-x-1 gap-y-0 justify-items-center">
          {normalEpisodes.map((ep, i) => {
            const best = progress[ep.id] ?? 0;
            const letters = lettersByEp[ep.id] ?? [];
            const progressRatio = Math.min(best / lessonTargetScore, 1);
            const progressPercent = Math.round(progressRatio * 100);
            const status = statusById[ep.id];
            const lessonHint =
              i === 0
                ? 'Все слова и фразы в уроке состоят только из букв этого урока'
                : 'Все слова и фразы в уроке состоят только из букв текущего и предыдущих уроков';
            const isRecommended = status === 'current';
            const showBadge =
              isRecommended || (status === 'almost' && best === 0);
            const badgeLabel =
              isRecommended
                  ? '✨ Рекомендуем'
                  : '🟡 Не начатый';
            const progressTone =
              status === 'mastered'
                ? 'bg-emerald-400/90'
                : status === 'almost'
                  ? 'bg-orange-300/90'
                  : status === 'current'
                    ? 'bg-yellow-200/70'
                    : 'bg-slate-600/80';

            return (
              <Link key={ep.id} href={`/study/${ep.id}`} legacyBehavior>
                <a
                  className={`lesson-card relative w-full max-w-[340px] aspect-square rounded-2xl bg-slate-900 border border-white/10 flex flex-col items-center justify-center gap-1 transition-all duration-200 ease-out shadow-[0_10px_20px_rgba(0,0,0,0.45)] ${isRecommended ? 'lesson-card--recommended' : ''} ${status !== 'locked' ? `${isRecommended ? '' : 'lesson-card--interactive'} hover:z-30 hover:border-blue-400/70 hover:bg-slate-900/80` : 'cursor-not-allowed opacity-65'}`}
                  onClick={e => {
                    if (status === 'locked') e.preventDefault();
                  }}
                  aria-disabled={status === 'locked'}
                >
                  <div className="group/lesson absolute top-3 left-4 flex flex-col">
                    <span className={`text-lg font-semibold ${isRecommended ? 'text-white/95' : 'text-white/85'}`}>Урок {i + 1}</span>
                    <span className="text-sm text-white/60">Изучаем новые буквы</span>
                    <div className="pointer-events-none absolute -top-9 left-[112px] z-50 w-[240px] rounded-md bg-slate-900/95 border border-white/15 px-2 py-1 text-[11px] leading-snug text-white/85 opacity-0 translate-y-1 transition-all group-hover/lesson:opacity-100 group-hover/lesson:translate-y-0">
                      {lessonHint}
                    </div>
                  </div>
                  {showBadge && (
                    <div
                      className={`absolute top-3 right-1.5 px-2 py-[1px] text-[10px] font-semibold ${isRecommended ? 'inline-flex items-center gap-0.5 rounded-[16px] bg-cyan-400/10 text-cyan-100/85' : 'rounded-full border border-white/15 bg-slate-900/80 text-white/90'}`}
                    >
                      {isRecommended ? (
                        <>
                          <span className="leading-none text-amber-300">✨</span>
                          <span className="leading-none">Рекомендуем</span>
                        </>
                      ) : (
                        badgeLabel
                      )}
                    </div>
                  )}

                  {/* буквы с транскрипцией */}
                  <div className="flex flex-wrap justify-center gap-2 mb-1 min-h-[2.2rem]">
                    {letters.map(ch => {
                      const tr = geLetterToTranslit(ch);
                      return (
                        <div
                          key={ch}
                          className="flex flex-col items-center text-amber-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]"
                        >
                          <span className="text-3xl leading-tight">{ch}</span>
                          {tr && (
                            <span className="text-sm text-[rgba(255,215,120,0.65)] leading-tight mt-1 tracking-wide">
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

                  <div className="group absolute bottom-3 left-4 w-[42%] max-w-[160px]">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isRecommended ? '[filter:saturate(1.05)]' : ''} ${progressTone}`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-white/55 whitespace-nowrap">{best}/{lessonTargetScore}</span>
                    </div>
                    <div className="pointer-events-none absolute -top-14 left-0 w-[190px] rounded-md bg-slate-900/95 border border-white/15 px-2 py-2 text-[11px] leading-tight text-white/85 opacity-0 translate-y-1 transition-all group-hover:opacity-100 group-hover:translate-y-0">
                      Показывает, сколько максимально очков ты набрал в игре урока и твою цель
                    </div>
                  </div>
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
            );
          })}
        </div>
      </section>

      {/* Избранное и Все уроки */}
      <section className="mt-6 flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
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
          className={`pointer-events-none absolute bottom-[calc(100%-6px)] left-[12%] -translate-x-1/2 w-[332px] z-30 transition-all ${showCatHint ? 'opacity-90 group-hover/cat:opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
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
            <div className="absolute inset-0 flex items-center justify-center px-12 text-[18px] leading-snug text-center font-semibold tracking-tight text-slate-900">
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
