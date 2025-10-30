'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { loadEpisode } from '@/lib/content';
import BlocksGame from '@/components/BlocksGame';
import TopBar from '@/components/TopBar';

type Word = { ge: string; ru: string; audio?: string };

export default function BlocksPage({ params }: { params: { episodeId: string } }) {
  const router = useRouter();
  const [words, setWords] = useState<Word[] | null>(null);
  const [title, setTitle] = useState<string>('');

  useEffect(() => {
    (async () => {
      const ep = await loadEpisode(params.episodeId);
      if (!ep) { router.replace('/'); return; }
      setTitle(ep.title);
      const ws: Word[] = ep.cards.filter(c => c.type === 'word').map(c => ({ ge: c.ge_text, ru: c.ru_meaning || '', audio: c.audio_url }));
      setWords(ws.length ? ws : []);
    })();
  }, [params.episodeId, router]);

  return (
    <main>
      <TopBar />
      <div className="flex items-center justify-between mb-4">
        <h1 className="h1">Блоки (как в Quizlet) — {title || params.episodeId}</h1>
        <Link className="btn" href="/">На карту</Link>
      </div>
      {words ? <BlocksGame words={words} episodeId={params.episodeId} /> : <div className="text-neutral-400">Загрузка…</div>}
    </main>
  );
}
