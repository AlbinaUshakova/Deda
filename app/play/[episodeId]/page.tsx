'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState, useMemo } from 'react';
import { loadEpisode } from '@/lib/content';
import { loadProgressMap, getLocalProgress } from '@/lib/supabase';
import BlocksGame from '@/components/BlocksGame';

type Word = { ge: string; ru: string; audio?: string };

export default function PlayPage({ params }: { params: { episodeId: string } }) {
  const { episodeId } = params;

  const [title, setTitle] = useState<string>('');
  const [words, setWords] = useState<Word[]>([]);
  const [initialBest, setInitialBest] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const ep = await loadEpisode(episodeId);
      if (cancelled) return;

      if (!ep) {
        setTitle(episodeId);
        setWords([]);
        setInitialBest(0);
        return;
      }

      setTitle(ep.title || episodeId);

      // читаем topic из query
      let topic: string | null = null;
      if (typeof window !== 'undefined') {
        const sp = new URLSearchParams(window.location.search);
        topic = sp.get('topic');
      }

      // берём только нужные карточки
      let cards = ep.cards.filter(
        (c: any) => c.type === 'word' || c.type === 'phrase',
      ) as any[];

      if (topic) {
        const filtered = cards.filter(c => c.topic === topic);
        if (filtered.length > 0) {
          cards = filtered;
        }
      }

      const ws: Word[] = cards.map((c: any) => ({
        ge: c.ge_text,
        ru: c.ru_meaning,
        audio: c.audio_url,
      }));
      setWords(ws);

      // локальный рекорд
      let localBest = 0;
      if (typeof window !== 'undefined') {
        const local = getLocalProgress();
        const row = local.find(r => r.episodeId === episodeId);
        if (row) localBest = row.best;
      }
      setInitialBest(localBest);

      // рекорд из Supabase
      try {
        const progressMap = await loadProgressMap();
        if (cancelled) return;
        const serverBest = progressMap[episodeId] ?? 0;
        if (serverBest > localBest) {
          setInitialBest(serverBest);
        }
      } catch (e) {
        console.error('load progress for episode error', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [episodeId]);

  const hasWords = useMemo(() => words.length > 0, [words]);
  const studyHref = `/study/${episodeId}` as Route;

  return (
    <main className="relative min-h-screen bg-[#020617] text-neutral-50">
      <div className="mx-auto max-w-5xl px-3 sm:px-4 md:px-6 py-8">
        <div className="relative z-40 mb-6 flex items-center justify-between gap-2 sm:gap-3">
          <h1 className="mb-0 min-w-0 text-[clamp(1.55rem,3.2vw,2rem)] font-semibold leading-tight tracking-[-0.01em]">
            {title || episodeId}
          </h1>
        </div>

        <div className="relative z-50">
          {hasWords ? (
            <>
              <BlocksGame
                words={words}
                episodeId={episodeId}
                initialBest={initialBest}
                topActions={
                  <>
                    <Link
                      className="inline-flex whitespace-nowrap items-center justify-center rounded-xl border border-white/15 bg-transparent px-[clamp(0.55rem,1.5vw,0.9rem)] py-[clamp(0.38rem,0.9vw,0.52rem)] text-[clamp(0.72rem,1.6vw,0.9rem)] text-white/70 transition-all duration-200 hover:bg-white/[0.05] hover:text-white"
                      href="/"
                    >
                      Главная
                    </Link>
                    <Link
                      className="inline-flex whitespace-nowrap items-center justify-center rounded-xl border border-emerald-300/45 bg-emerald-300/[0.09] px-[clamp(0.55rem,1.5vw,0.9rem)] py-[clamp(0.38rem,0.9vw,0.52rem)] text-[clamp(0.72rem,1.6vw,0.9rem)] text-emerald-200 shadow-[0_0_10px_rgba(80,255,200,0.12)] transition-all duration-200 hover:shadow-[0_0_14px_rgba(80,255,200,0.18)] hover:text-emerald-100"
                      href={studyHref}
                    >
                      Карточки
                    </Link>
                  </>
                }
              />
            </>
          ) : (
            <div className="text-neutral-400 mt-8">
              В этом эпизоде пока нет слов для игры.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
