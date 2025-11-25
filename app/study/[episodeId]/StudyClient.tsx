'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import FlashcardDeck from '@/components/FlashcardDeck';

export default function StudyClient({
  episodeId,
  bundled,
}: {
  episodeId: string;
  bundled: any;
}) {
  // достаем данные эпизода
  let ep = bundled;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('deda_content_json');
      if (raw) {
        const parsed = JSON.parse(raw);
        const found = parsed.episodes.find((e: any) => e.id === episodeId);
        if (found) ep = found;
      }
    } catch { }
  }

  if (!ep) return <div className="p-6">Эпизод не найден</div>;

  const words = useMemo(
    () => ep.cards.filter((c: any) => c.type === 'word' || c.type === 'letter'),
    [ep],
  );

  const hasWords = words.length > 0;

  return (
    <main className="min-h-screen bg-[#020617] text-neutral-50">

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold mb-4">
            {ep.title || episodeId}
          </h1>

          <div className="flex gap-2">
            <Link className="btn" href="/">
              Главная
            </Link>
            <Link className="btn" href={`/play/${episodeId}`}>
              Играть
            </Link>
          </div>
        </div>

        {hasWords ? (
          <FlashcardDeck cards={words} nativeLang="RU" />
        ) : (
          <div className="text-neutral-400 mt-8">
            В этом эпизоде пока нет слов для карточек.
          </div>
        )}
      </div>
    </main>
  );
}
