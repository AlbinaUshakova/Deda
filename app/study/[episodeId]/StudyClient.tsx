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
    <main className="min-h-screen bg-[#020617] text-neutral-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6 max-w-[820px] lg:translate-x-6">
          <h1 className="text-2xl font-semibold lg:translate-x-[4.5rem]">
            {ep.title || episodeId}
          </h1>

          <div className="flex gap-2 ml-auto justify-end lg:translate-x-16">
            <Link
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-transparent px-4 py-2 text-sm text-white/65 hover:bg-white/[0.04] hover:text-white/90 transition-all"
              href="/"
            >
              Главная
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-xl border border-orange-300/55 bg-orange-300/[0.1] px-4 py-2 text-sm text-orange-100 shadow-[0_0_12px_rgba(251,146,60,0.22)] hover:bg-orange-300/[0.14] hover:text-white hover:shadow-[0_0_16px_rgba(251,146,60,0.3)] transition-all"
              href={playHref as Route}
            >
              Играть
            </Link>
          </div>
        </div>

        {hasWords ? (
          <FlashcardDeck
            cards={words}
            lessonTitle={ep.title || episodeId}
            onTopicChange={setTopicForPlay}
          />
        ) : (
          <div className="text-neutral-400 mt-8">
            В этом эпизоде пока нет слов для карточек.
          </div>
        )}
      </div>
    </main>
  );
}
