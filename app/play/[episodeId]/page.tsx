// app/play/[episodeId]/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { loadEpisode } from '@/lib/content';
import { loadProgressMap } from '@/lib/supabase';
import BlocksGame from '@/components/BlocksGame';

type Word = { ge: string; ru: string; audio?: string };

export default function PlayPage({ params }: { params: { episodeId: string } }) {
  const { episodeId } = params;

  const [title, setTitle] = useState<string>('');
  const [words, setWords] = useState<Word[]>([]);
  const [initialBest, setInitialBest] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      // 1) грузим эпизод
      const ep = await loadEpisode(episodeId);
      if (!ep) {
        setTitle(episodeId);
        setWords([]);
        setInitialBest(0);
        return;
      }

      setTitle(ep.title || episodeId);

      const ws: Word[] = ep.cards
        .filter((c: any) => c.type === 'word' || c.type === 'phrase')
        .map((c: any) => ({
          ge: c.ge_text,
          ru: c.ru_meaning,
          audio: c.audio_url,
        }));
      setWords(ws);

      // 2) рекорд уровня из прогресса (тот же, что на карте)
      const progressMap = await loadProgressMap();
      const best = progressMap[episodeId] ?? 0;
      setInitialBest(best);
    })();
  }, [episodeId]);

  const hasWords = useMemo(() => words.length > 0, [words]);

  const loadingBest = initialBest === null;

  return (
    <main className="relative min-h-screen bg-[#020617] text-neutral-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="relative z-40 flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold mb-4">
            {title || episodeId}
          </h1>

          <Link className="btn relative z-50" href="/">
            На карту
          </Link>
        </div>

        <div className="relative z-10">
          {hasWords ? (
            loadingBest ? (
              <div className="text-neutral-400 mt-8">
                Загрузка…
              </div>
            ) : (
              <BlocksGame
                words={words}
                episodeId={episodeId}
                initialBest={initialBest ?? 0}
              />
            )
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
