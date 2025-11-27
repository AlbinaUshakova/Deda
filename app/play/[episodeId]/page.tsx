'use client';

import Link from 'next/link';
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

  return (
    <main className="relative min-h-screen bg-[#020617] text-neutral-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="relative z-40 flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold mb-4">
            {title || episodeId}
          </h1>

          <Link className="btn relative z-50" href="/">
            Главная
          </Link>
        </div>

        <div className="relative z-10">
          {hasWords ? (
            <BlocksGame
              words={words}
              episodeId={episodeId}
              initialBest={initialBest}
            />
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
