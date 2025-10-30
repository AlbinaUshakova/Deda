'use client';
import FlashcardDeck from '@/components/FlashcardDeck';

export default function StudyClient({ episodeId, bundled }: { episodeId: string; bundled: any }) {
  let ep = bundled;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('deda_content_json');
      if (raw) {
        const parsed = JSON.parse(raw);
        const found = parsed.episodes.find((e: any) => e.id === episodeId);
        if (found) ep = found;
      }
    } catch {}
  }
  if (!ep) return <div className="p-6">Эпизод не найден</div>;
  const words = ep.cards.filter((c:any)=> c.type === 'word' || c.type === 'letter');
  return (
    <main>
      <h1 className="h1 mb-4">Учить — {ep.title || episodeId}</h1>
      <FlashcardDeck cards={words} nativeLang="RU" />
    </main>
  );
}
