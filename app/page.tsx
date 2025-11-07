'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listEpisodes, loadNewLettersPerEpisode } from '@/lib/content';
import TopBar from '@/components/TopBar';

type Ep = { id: string; title: string; best?: number };

export default function HomePage() {
  const [eps, setEps] = useState<Ep[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [lettersByEp, setLettersByEp] = useState<Record<string, string[]>>({});

  useEffect(() => {
    (async () => {
      const data = await listEpisodes();
      setEps(data);

      const letters = await loadNewLettersPerEpisode();
      setLettersByEp(letters);
    })();

    const loadProgress = () => {
      try {
        const raw = localStorage.getItem('deda_progress');
        const arr: any[] = raw ? JSON.parse(raw) : [];
        const map: Record<string, number> = {};
        arr.forEach(x => (map[x.episodeId] = x.best ?? 0));
        setProgress(map);
      } catch { }
    };

    loadProgress();
    const onUpd = () => loadProgress();
    window.addEventListener('deda:progress-updated' as any, onUpd);
    return () => window.removeEventListener('deda:progress-updated' as any, onUpd);
  }, []);

  const normalEpisodes = eps.filter(ep => /^ep\d+$/.test(ep.id));
  const specials = eps.filter(ep => !/^ep\d+$/.test(ep.id));

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 relative overflow-hidden">
      <TopBar />

      {/* сетка эпизодов */}
      <section className="max-w-5xl mx-auto mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {normalEpisodes.map((ep, i) => {
            const best = progress[ep.id] ?? 0;
            const letters = lettersByEp[ep.id] ?? [];
            const unlocked = best > 0;

            return (
              <Link key={ep.id} href={`/study/${ep.id}`} legacyBehavior>
                <a className="relative aspect-square rounded-2xl bg-slate-900 border border-white/10 flex flex-col items-center justify-center gap-1 hover:border-blue-400/70 hover:bg-slate-900/80 transition-colors shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
                  <div className="text-3xl font-semibold text-white mb-1">
                    {i + 1}
                  </div>

                  {/* буквы */}
                  <div className="flex flex-wrap justify-center gap-1 text-xl text-amber-300 mb-1 min-h-[1.75rem]">
                    {letters.map(ch => (
                      <span key={ch} className="px-1 drop-shadow-[0_2px_2px_rgba(0,0,0,0.3)]">
                        {ch}
                      </span>
                    ))}
                    {!letters.length && (
                      <span className="text-xs text-neutral-500">
                        без новых букв
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-neutral-400">
                    {unlocked ? `Рекорд: ${best}` : 'Новый эпизод'}
                  </div>
                </a>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Избранное и Все слова */}
      <section className="mt-8 flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
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
        className="absolute bottom-10 left-[10%] z-10"
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
          className="w-[330px] drop-shadow-[0_12px_30px_rgba(0,0,0,0.6)] animate-cloud"
        />
      </div>
    </main>
  );
}
