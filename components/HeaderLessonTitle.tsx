'use client';

import { usePathname } from 'next/navigation';

function buildHeaderTitle(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return '';

  const section = parts[0];
  const episodeId = decodeURIComponent(parts[1] || '');
  if (!episodeId) return '';

  if (section !== 'play' && section !== 'study' && section !== 'blocks') {
    return '';
  }

  const match = episodeId.match(/^ep(\d+)$/i);
  if (match) return `Урок ${match[1]}`;
  if (episodeId === 'favorites') return 'Избранное';
  if (episodeId === 'all') return 'Все уроки';

  return episodeId;
}

export default function HeaderLessonTitle() {
  const pathname = usePathname();
  const title = buildHeaderTitle(pathname);

  if (!title) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 flex justify-center">
      <h1 className="max-w-[58vw] truncate text-center text-xl font-semibold tracking-[-0.01em] text-slate-700">
        {title}
      </h1>
    </div>
  );
}

