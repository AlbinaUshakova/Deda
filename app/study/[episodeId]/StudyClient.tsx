'use client';

import { useEffect, useMemo, useState } from 'react';
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
          const cachedEpisode = {
            ...found,
            cards: found.cards.map((c: any) => ({
              ...c,
              ge_text: normalizeGeorgianText(c.ge_text),
            })),
          };
          // Не даём устаревшему кэшу затирать свежий bundled контент.
          if (!ep || (cachedEpisode.cards?.length ?? 0) >= (ep.cards?.length ?? 0)) {
            ep = cachedEpisode;
          }
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

  useEffect(() => {
    document.documentElement.classList.add('app-no-page-scroll');
    document.body.classList.add('app-no-page-scroll');
    return () => {
      document.documentElement.classList.remove('app-no-page-scroll');
      document.body.classList.remove('app-no-page-scroll');
    };
  }, []);

  return (
    <main className="study-card-screen app-screen-fixed min-h-screen bg-transparent text-[var(--text-primary)]">
      <div className="mx-auto h-full w-full overflow-hidden px-[clamp(14px,3.6vw,48px)] py-[clamp(16px,2.6vh,32px)] lg:pl-[124px]">
        <div className="relative z-30 mb-2 mx-auto w-full max-w-[980px]">
          <div className="relative flex min-h-[52px] items-center justify-end">
            <div className="topButtons ml-auto flex flex-wrap justify-end gap-2 lg:pr-[112px]">
            <Link
              className="play-tab--secondary inline-flex items-center justify-center rounded-xl border border-slate-300 bg-transparent px-3.5 sm:px-4 max-[1000px]:px-3 py-2 max-[1000px]:py-1.5 text-sm max-[1000px]:text-xs font-medium text-[var(--text-secondary)] shadow-sm transition-all duration-200 hover:border-slate-400 hover:bg-white/70 hover:text-[var(--text-primary)]"
              href="/"
            >
              Главная
            </Link>
            <Link
              className="play-tab--secondary inline-flex items-center justify-center rounded-xl border border-slate-300 bg-transparent px-3.5 sm:px-4 max-[1000px]:px-3 py-2 max-[1000px]:py-1.5 text-sm max-[1000px]:text-xs font-medium text-[var(--text-secondary)] shadow-sm transition-all duration-200 hover:border-slate-400 hover:bg-white/70 hover:text-[var(--text-primary)]"
              href={playHref as Route}
            >
              Играть
            </Link>
            </div>
          </div>
        </div>

        {hasWords ? (
          <div className="relative z-0 mt-[clamp(2px,0.8vh,10px)]">
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
