'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import FlashcardDeck from '@/components/FlashcardDeck';

export default function StudyClient({
  episodeId,
  bundled,
}: {
  episodeId: string;
  bundled: any;
}) {
  const normalizeGeorgianText = (text: string) =>
    /[\u10D0-\u10FF]/.test(text) ? text.replace(/и/g, 'ი').replace(/И/g, 'ი') : text;

  // достаем данные эпизода
  let ep = bundled;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('deda_content_json');
      if (raw) {
        const parsed = JSON.parse(raw);
        const found = parsed.episodes.find((e: any) => e.id === episodeId);
        if (found) {
          ep = {
            ...found,
            cards: found.cards.map((c: any) => ({
              ...c,
              ge_text: normalizeGeorgianText(c.ge_text),
            })),
          };
        }
      }
    } catch { }
  }

  if (!ep) return <div className="p-6">Эпизод не найден</div>;

  const words = useMemo(
    () => ep.cards.filter((c: any) => c.type === 'word' || c.type === 'letter'),
    [ep],
  );

  const hasWords = words.length > 0;

  // выбранная тема для кнопки "Играть"
  const [topicForPlay, setTopicForPlay] = useState<string | null>(null);

  const playHref =
    topicForPlay && hasWords
      ? `/play/${episodeId}?topic=${encodeURIComponent(topicForPlay)}`
      : `/play/${episodeId}`;

  return (
    <main className="min-h-screen bg-transparent text-slate-800">
      <div className="mx-auto w-full px-3 sm:px-4 md:px-6 py-8 lg:pl-[124px]">
        <div className="relative z-30 mb-2 mx-auto w-full max-w-[980px]">
          <div className="relative flex min-h-[52px] items-center justify-end">
            <div className="ml-auto flex flex-wrap justify-end gap-2 lg:pr-[112px]">
            <Link
              className="play-tab--secondary inline-flex items-center justify-center rounded-xl border border-slate-300 bg-transparent px-3.5 sm:px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-400 hover:bg-white/70 hover:text-slate-900"
              href="/"
            >
              Главная
            </Link>
            <Link
              className="play-tab--primary inline-flex items-center justify-center rounded-xl border border-indigo-600 bg-indigo-600 px-3.5 sm:px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:border-indigo-500 hover:bg-indigo-500"
              href={playHref as Route}
            >
              Играть
            </Link>
            </div>
          </div>
        </div>

        {hasWords ? (
          <div className="relative z-0 mt-1 md:mt-0 lg:-mt-6 xl:-mt-8">
            <FlashcardDeck
              cards={words}
              lessonTitle={ep.title || episodeId}
              onTopicChange={setTopicForPlay}
            />
          </div>
        ) : (
          <div className="text-neutral-400 mt-8">
            В этом эпизоде пока нет слов для карточек.
          </div>
        )}
      </div>
    </main>
  );
}
