'use client';
import { useEffect, useMemo, useState } from 'react';

type Card = { id:string; ge_text:string; translit?:string; ru_meaning?:string; audio_url?:string; type?: 'word'|'letter' };

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

export default function FlashcardDeck({ cards, nativeLang='RU' }: { cards: Card[]; nativeLang?: 'RU'|'EN'|string }) {
  const [idx, setIdx] = useState(0);
  const [order, setOrder] = useState<number[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [starred, setStarred] = useState<Record<string, boolean>>({});
  const [onlyStarred, setOnlyStarred] = useState(false);

  const visible = useMemo(() => {
    const source = onlyStarred ? cards.filter(c => starred[c.id]) : cards;
    return source;
  }, [cards, starred, onlyStarred]);

  useEffect(() => {
    setOrder(visible.map((_,i)=>i));
    setIdx(0);
    setFlipped(false);
  }, [visible]);

  useEffect(() => {
    const card = visible[order[idx]];
    if (!card) return;
    // Autoplay strictly on the study language side (Georgian/front)
    if (card.audio_url && !flipped) {
      try { const a = new Audio(card.audio_url); a.play().catch(()=>{}); } catch {}
    }
  }, [idx, flipped, visible, order]);

  const card = visible[order[idx]];
  if (!card) return <div className="text-neutral-400">Нет карточек</div>;

  const onPrev = () => { setIdx(i => (i>0? i-1 : visible.length-1)); setFlipped(false); };
  const onNext = () => { setIdx(i => (i+1) % visible.length); setFlipped(false); };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button className="btn" onClick={()=>{ setOrder(o=>shuffle(o)); setIdx(0); setFlipped(false); }}>Перемешать</button>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyStarred} onChange={e=>setOnlyStarred(e.target.checked)} />Только отмеченные</label>
        <button className="btn" onClick={()=>setStarred(s => ({...s, [card.id]: !s[card.id]}))}>{starred[card.id] ? '★ Убрать' : '☆ Отметить'}</button>
      </div>

      {/* CARD */}
      <button onClick={()=>setFlipped(f=>!f)} className="card p-6 w-full text-left">
        {/* FRONT — studied language (Georgian) */}
        {!flipped ? (
          <div>
            <div className="text-3xl mb-2">{card.ge_text}</div>
            {card.translit && <div className="text-neutral-300">Транслит: <span className="badge">{card.translit}</span></div>}
            {/* Audio control stays ONLY on the front */}
            {card.audio_url && <audio className="mt-3 w-full" controls src={card.audio_url} />}
            <div className="text-xs text-neutral-400 mt-2">Нажми, чтобы перевернуть</div>
          </div>
        ) : (
          // BACK — definition side (native language). No audio here.
          <div>
            <div className="text-neutral-300">Перевод ({nativeLang}): <span className="badge">{card.ru_meaning || '—'}</span></div>
            <div className="text-xs text-neutral-400 mt-2">Нажми, чтобы перевернуть обратно</div>
          </div>
        )}
      </button>

      {/* NAV */}
      <div className="flex items-center justify-between">
        <button className="btn" onClick={onPrev}>← Назад</button>
        <div className="text-sm text-neutral-400">Карточка {idx+1} из {visible.length}</div>
        <button className="btn" onClick={onNext}>Вперёд →</button>
      </div>
    </div>
  );
}
