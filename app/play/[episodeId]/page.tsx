// app/play/[episodeId]/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { loadEpisode } from '@/lib/content';
import TopBar from '@/components/TopBar';
import BlocksGame from '@/components/BlocksGame';

type Word = { ge: string; ru: string; audio?: string };

export default function PlayPage({ params }: { params: { episodeId: string } }) {
  const { episodeId } = params;

  const [title, setTitle] = useState<string>('');
  const [words, setWords] = useState<Word[]>([]);

  useEffect(() => {
    (async () => {
      const ep = await loadEpisode(episodeId);
      if (!ep) {
        setTitle(episodeId);
        setWords([]);
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
    })();
  }, [episodeId]);

  const hasWords = useMemo(() => words.length > 0, [words]);

  return (
    <main className="relative min-h-screen bg-[#020617] text-neutral-50">
      {/* TopBar теперь поверх игры */}
      <div className="relative z-40">
        <TopBar />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Заголовок + кнопка — подняты по z-index */}
        <div className="relative z-40 flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold mb-4">
            {title || episodeId}
          </h1>

          <Link
            className="btn relative z-50"
            href="/"
          >
            На карту
          </Link>
        </div>

        {/* Игровой компонент ниже по слоям */}
        <div className="relative z-10">
          {hasWords ? (
            <BlocksGame words={words} episodeId={episodeId} />
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
