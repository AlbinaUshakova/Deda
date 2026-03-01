'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import MatchGame from '@/components/MatchGame';

type Word = { ge: string; ru: string; audio?: string };
type Card = { type: 'word' | 'phrase'; ge_text: string; ru_meaning: string; audio_url?: string };
type Episode = { id: string; title: string; cards: Card[] };
type EpisodeApiResponse = { ok: boolean; episode?: Episode };

async function loadEpisodeById(episodeId: string): Promise<Episode | null> {
  const res = await fetch(`/api/content/episode?id=${encodeURIComponent(episodeId)}`, {
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load episode');
  const json = (await res.json()) as EpisodeApiResponse;
  return json.episode ?? null;
}

export default function MatchPage({ params }: { params: { episodeId: string } }) {
  const router = useRouter();
  const [words, setWords] = useState<Word[] | null>(null);
  const [title, setTitle] = useState<string>('');

  useEffect(() => {
    (async () => {
      const ep = await loadEpisodeById(params.episodeId);
      if (!ep) { router.replace('/'); return; }
      setTitle(ep.title);
      const ws: Word[] = ep.cards.filter(c => c.type === 'word').map(c => ({ ge: c.ge_text, ru: c.ru_meaning || '', audio: c.audio_url }));
      setWords(ws.length ? ws : []);
    })();
  }, [params.episodeId, router]);

  return (
    <main>
      <div className="flex items-center justify-between mb-4">
        <h1 className="h1">Совпадения — {title || params.episodeId}</h1>
        <Link className="btn" href="/">Главная</Link>
      </div>
      {words ? <MatchGame words={words} /> : <div className="text-neutral-400">Загрузка…</div>}
    </main>
  );
}
