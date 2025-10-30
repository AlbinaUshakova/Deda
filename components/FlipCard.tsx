'use client';
import { useState } from 'react';
export default function FlipCard({ front, back }: { front: React.ReactNode; back: React.ReactNode }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button onClick={()=>setFlipped(!flipped)} className={`card p-4 w-full text-left transition [transform-style:preserve-3d]`}>
      {!flipped ? front : back}
      <div className="text-xs text-neutral-400 mt-2">{flipped ? 'нажми чтобы перевернуть обратно' : 'нажми чтобы перевернуть'}</div>
    </button>
  );
}
