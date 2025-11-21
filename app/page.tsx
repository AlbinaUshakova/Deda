'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listEpisodes, loadNewLettersPerEpisode } from '@/lib/content';
import {
  loadProgressMap,
  getLocalProgress,
  type ProgressMap,
} from '@/lib/supabase';

type Ep = { id: string; title: string; best?: number };

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

  useEffect(() => {
    const init = async () => {
      const data = await listEpisodes();
      setEps(data);

      const letters = await loadNewLettersPerEpisode();
      setLettersByEp(letters);

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
      window.addEventListener('deda:progress-updated' as any, onUpd);
      return () =>
        window.removeEventListener('deda:progress-updated' as any, onUpd);
    }
  }, []);

  const normalEpisodes = eps.filter(ep => /^ep\d+$/.test(ep.id));
  const specials = eps.filter(ep => !/^ep\d+$/.test(ep.id));

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 relative overflow-hidden">
      {/* сетка эпизодов */}
      <section className="max-w-3xl mx-auto mt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-1 gap-y-0 justify-items-center">
          {normalEpisodes.map((ep, i) => {
            const best = progress[ep.id] ?? 0;
            const letters = lettersByEp[ep.id] ?? [];

            return (
              <Link key={ep.id} href={`/study/${ep.id}`} legacyBehavior>
                <a className="relative w-full aspect-square rounded-2xl bg-slate-900 border border-white/10 flex flex-col items-center justify-center gap-1 hover:border-blue-400/70 hover:bg-slate-900/80 transition-colors shadow-[0_10px_20px_rgba(0,0,0,0.45)]">
                  <div className="absolute top-3 left-4 text-lg font-semibold text-white/80">
                    Урок {i + 1}
                  </div>

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
                            <span className="text-sm text-amber-200/90 leading-tight mt-1 tracking-wide">
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

                  {best > 0 && (
                    <div className="absolute bottom-3 right-4 flex items-center gap-1 text-xs text-amber-300">
                      <span>🏆</span>
                      <span>{best}</span>
                    </div>
                  )}
                </a>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Избранное и Все слова */}
      <section className="mt-6 flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
        {specials.map(ep => {
          const isFav = ep.id === 'favorites';
          const cleanTitle = ep.title.replace(/^⭐\s*/, '');

          return (
            <Link key={ep.id} href={`/study/${ep.id}`} legacyBehavior>
              <a className="px-4 py-3 rounded-2xl bg-slate-900 border border-white/10 text-sm text-neutral-100 flex items-center gap-2 hover:border-blue-400/70 hover:bg-slate-900/80 transition-colors shadow-lg">
                {isFav && <span>⭐</span>}
                <span>{cleanTitle}</span>
              </a>
            </Link>
          );
        })}
      </section>

      {/* кот Deda слева у поля */}
      <div
        className="absolute bottom-8 left-[14%] z-10"
        onClick={() => {
          const meow = new Audio('/sounds/meow.mp3');
          meow.volume = 0.5;
          meow.play().catch(() => { });
        }}
        style={{ cursor: 'pointer' }}
      >
        <img
          src="/images/deda-cat.png"
          alt="Кот Deda, читает книгу"
          className="w-[320px] drop-shadow-[0_12px_30px_rgba(0,0,0,0.6)] animate-cloud"
        />
      </div>
    </main>
  );
}
