'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useEffect, useState, useMemo } from 'react';
import { Nunito } from 'next/font/google';
import { loadProgressMap, getLocalProgress } from '@/lib/supabase';
import BlocksGame from '@/components/BlocksGame';

type Word = { ge: string; ru: string; audio?: string };
type Card = { type: 'word' | 'phrase'; ge_text: string; ru_meaning: string; audio_url?: string; topic?: string };
type Episode = { id: string; title: string; cards: Card[] };
type EpisodeApiResponse = { ok: boolean; episode?: Episode };

const nunito = Nunito({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600', '700'],
  display: 'swap',
});

function getEpisodeFallbackTitle(episodeId: string): string {
  const match = episodeId.match(/^ep(\d+)$/i);
  if (match) return `Урок ${match[1]}`;
  return episodeId;
}

async function loadEpisodeById(episodeId: string): Promise<Episode | null> {
  const res = await fetch(`/api/content/episode?id=${encodeURIComponent(episodeId)}`, {
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load episode');
  const json = (await res.json()) as EpisodeApiResponse;
  return json.episode ?? null;
}

export default function PlayPage({ params }: { params: { episodeId: string } }) {
  const { episodeId } = params;

  const [title, setTitle] = useState<string>('');
  const [words, setWords] = useState<Word[]>([]);
  const [initialBest, setInitialBest] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const ep = await loadEpisodeById(episodeId);
        if (cancelled) return;

        if (!ep) {
          setTitle(episodeId);
          setWords([]);
          setInitialBest(0);
          setIsLoading(false);
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
        setIsLoading(false);

        // Рекорд из Supabase догружаем в фоне, чтобы не блокировать первый рендер игры.
        loadProgressMap()
          .then(progressMap => {
            if (cancelled) return;
            const serverBest = progressMap[episodeId] ?? 0;
            if (serverBest > localBest) {
              setInitialBest(serverBest);
            }
          })
          .catch(e => {
            console.error('load progress for episode error', e);
          });
      } catch (e) {
        console.error('load play episode error', e);
        if (!cancelled) {
          setTitle(episodeId);
          setWords([]);
          setInitialBest(0);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [episodeId]);

  const hasWords = useMemo(() => words.length > 0, [words]);
  const studyHref = `/study/${episodeId}` as Route;
  const pageTitle = title || getEpisodeFallbackTitle(episodeId);

  return (
    <main className={`${nunito.className} relative min-h-screen bg-transparent text-[var(--text-primary)]`}>
      <div className="mx-auto w-full px-3 sm:px-4 md:px-6 py-8 lg:pl-[124px]">
        <div className="relative z-30 mb-2 mx-auto w-full max-w-[980px]">
          <div className="relative flex min-h-[52px] items-center justify-end">
            <div className="topButtons ml-auto flex flex-wrap justify-end gap-2 lg:pr-[112px]">
            <Link
              className="play-tab--secondary inline-flex items-center justify-center rounded-xl border border-slate-300 bg-transparent px-[clamp(10px,1.35vw,14px)] py-[clamp(6px,1vw,8px)] text-[clamp(11px,1.15vw,13px)] font-medium text-[var(--text-secondary)] shadow-sm transition-all duration-200 hover:border-slate-400 hover:bg-white/70 hover:text-[var(--text-primary)]"
              style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}
              href="/"
            >
              Главная
            </Link>
            <Link
              className="play-tab--secondary inline-flex items-center justify-center rounded-xl border border-slate-300 bg-transparent px-[clamp(10px,1.35vw,14px)] py-[clamp(6px,1vw,8px)] text-[clamp(11px,1.15vw,13px)] font-medium text-[var(--text-secondary)] shadow-sm transition-all duration-200 hover:border-slate-400 hover:bg-white/70 hover:text-[var(--text-primary)]"
              style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}
              href={studyHref}
            >
              Карточки
            </Link>
            </div>
          </div>
        </div>

        <div className="relative z-50 w-full">
          {isLoading ? null : hasWords ? (
            <>
              <BlocksGame
                words={words}
                episodeId={episodeId}
                initialBest={initialBest}
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
