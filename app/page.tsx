// app/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listEpisodes } from '@/lib/content';
import TopBar from '@/components/TopBar';

type Ep = { id: string; title: string; best?: number };

export default function HomePage() {
  const [eps, setEps] = useState<Ep[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const data = await listEpisodes();
      setEps(data);
    })();

    const loadProgress = () => {
      try {
        const raw = localStorage.getItem('deda_progress');
        const arr: any[] = raw ? JSON.parse(raw) : [];
        const map: Record<string, number> = {};
        arr.forEach(x => (map[x.episodeId] = x.best ?? 0));
        setProgress(map);
      } catch {}
    };

    loadProgress();
    const onUpd = () => loadProgress();
    window.addEventListener('deda:progress-updated' as any, onUpd);
    return () => window.removeEventListener('deda:progress-updated' as any, onUpd);
  }, []);

  return (
    <main className="p-6">
      <TopBar />
      <div className="flex items-center justify-between mb-6">
        <h1 className="h1">Карта эпизодов</h1>
        <Link href="/profile" className="btn">Профиль</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {eps.map(ep => (
          <Link key={ep.id} href={`/study/${ep.id}`} legacyBehavior>
            <a className="card p-4 hover:bg-[#0e1726] transition block focus:outline-none focus:ring-2 focus:ring-blue-400">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-semibold">{ep.title}</div>
                {ep.id === 'favorites' && <span className="badge">⭐</span>}
                {ep.id === 'all' && <span className="badge">∞</span>}
              </div>
              <div className="text-sm text-neutral-400 mt-2">
                Лучший результат: {progress[ep.id] ?? 0}
              </div>
            </a>
          </Link>
        ))}
      </div>
    </main>
  );
}
