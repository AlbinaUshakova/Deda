'use client';
import { useEffect, useMemo, useState } from 'react';

type Word = { ge: string; ru: string; audio?: string };

function shuffle<T>(arr: T[]): T[] { const a = arr.slice(); for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

type Tile = { id: string; text: string; kind: 'term'|'def'; wordIdx: number; matched: boolean };

export default function MatchGame({ words }: { words: Word[] }) {
  const [round, setRound] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [sel, setSel] = useState<number[]>([]);
  const [startAt, setStartAt] = useState<number | null>(null);
  const [time, setTime] = useState<number>(0);
  const [penalty, setPenalty] = useState<number>(0);
  const [finished, setFinished] = useState(false);

  const roundWords = useMemo(() => {
    const start = (round * 6) % Math.max(words.length, 6);
    const pool = words.slice();
    const picked = [];
    for (let i = 0; i < Math.min(6, words.length); i++) picked.push(pool[(start + i) % words.length]);
    return picked;
  }, [round, words]);

  useEffect(() => {
    const t: Tile[] = [];
    roundWords.forEach((w, idx) => {
      t.push({ id: `t${idx}`, text: w.ge, kind: 'term', wordIdx: idx, matched: false });
      t.push({ id: `d${idx}`, text: w.ru, kind: 'def', wordIdx: idx, matched: false });
    });
    setTiles(shuffle(t));
    setSel([]);
    setTime(0);
    setPenalty(0);
    setFinished(false);
    setStartAt(performance.now());
  }, [round, roundWords]);

  useEffect(() => {
    if (startAt === null || finished) return;
    const raf = requestAnimationFrame(function step(now){ 
      setTime((now - (startAt||now))/1000); 
      if (!finished) requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [startAt, finished]);

  const onPick = (i: number) => {
    if (finished) return;
    if (tiles[i].matched) return;
    if (sel.length === 0) { setSel([i]); return; }
    if (sel.length === 1) {
      const j = sel[0];
      if (i === j) return;
      const a = tiles[j], b = tiles[i];
      if (a.wordIdx === b.wordIdx && a.kind !== b.kind) {
        const next = tiles.slice();
        next[i] = { ...b, matched: true };
        next[j] = { ...a, matched: true };
        setTiles(next);
        setSel([]);
        if (next.every(t => t.matched)) setFinished(true);
      } else {
        setPenalty(p => p + 1);
        setSel([]);
      }
    }
  };

  const total = Math.max(0, time + penalty);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-400">Раунд: {round+1}</div>
        <div className="text-sm text-neutral-400">Время: <span className="badge">{total.toFixed(1)}s</span> (+{penalty}s)</div>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
        {tiles.map((t, i) => (
          <button key={t.id} onClick={()=>onPick(i)}
            className={`card p-3 text-center ${t.matched ? 'opacity-60' : 'hover:bg-neutral-800'} ${sel.includes(i) ? 'ring-2 ring-neutral-400' : ''}`}>
            <div className="text-sm">{t.text}</div>
          </button>
        ))}
      </div>
      {finished ? (
        <div className="card p-4">
          <div className="mb-2">Раунд завершён! Время: <span className="badge">{total.toFixed(1)}s</span></div>
          <button className="btn" onClick={()=>setRound(r=>r+1)}>Следующий раунд</button>
        </div>
      ) : (
        <div className="text-xs text-neutral-500">Совмести грузинское слово с переводом. За ошибку +1 секунда.</div>
      )}
    </div>
  );
}
