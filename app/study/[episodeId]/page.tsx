
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { loadEpisode } from '@/lib/content';
import TopBar from '@/components/TopBar';

type Card = { type: 'word' | 'phrase'; ge_text: string; ru_meaning: string; audio_url?: string };

export default function StudyPage({ params }: { params: { episodeId: string } }) {
  const { episodeId } = params;

  // data
  const [title, setTitle] = useState('');
  const [cards, setCards] = useState<Card[]>([]);
  const [favSet, setFavSet] = useState<Set<string>>(new Set());

  // ui state
  const [idx, setIdx] = useState(0);
  const [flip, setFlip] = useState(false);          // лицo/оборот
  const [revealCount, setRevealCount] = useState(0); // сколько букв показать в подсказке
  const [trackProgress, setTrackProgress] = useState(true);
  const [autoplay, setAutoplay] = useState(false);

  const total = cards.length;
  const card = cards[idx] || null;

  // load episode
  useEffect(() => {
    (async () => {
      const ep = await loadEpisode(episodeId);
      if (!ep) return;

      setTitle(ep.title);

      const fav = readFav();
      setFavSet(fav);

      const c = (ep.cards.filter(c => c.type === 'word' || c.type === 'phrase') as Card[]);
      setCards(c);
      setIdx(0);
      setFlip(false);
      setRevealCount(0);
      setAutoplay(false);
    })();
  }, [episodeId]);

  // favorites
  function readFav(): Set<string> {
    try {
      const raw = localStorage.getItem('deda_fav_ge');
      if (!raw) return new Set();
      return new Set(JSON.parse(raw) as string[]);
    } catch { return new Set(); }
  }
  function writeFav(next: Set<string>) {
    localStorage.setItem('deda_fav_ge', JSON.stringify(Array.from(next)));
  }
  const toggleFav = useCallback((ge: string) => {
    setFavSet(prev => {
      const next = new Set(prev);
      if (next.has(ge)) next.delete(ge); else next.add(ge);
      writeFav(next);
      if (episodeId === 'favorites') {
        setCards(cs => {
          const filtered = cs.filter(c => next.has(c.ge_text));
          if (idx >= filtered.length) setIdx(Math.max(0, filtered.length - 1));
          return filtered;
        });
      }
      return next;
    });
  }, [episodeId, idx]);

  // nav
  const goNext = useCallback(() => {
    if (!total) return;
    setIdx(i => Math.min(total - 1, i + 1));
    setFlip(false);
    setRevealCount(0);
  }, [total]);

  const goPrev = useCallback(() => {
    if (!total) return;
    setIdx(i => Math.max(0, i - 1));
    setFlip(false);
    setRevealCount(0);
  }, [total]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlip(f => !f); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  // autoplay
  const autoplayRef = useRef<number | null>(null);
  useEffect(() => {
    if (!autoplay || !total) {
      if (autoplayRef.current) {
        window.clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
      return;
    }
    autoplayRef.current = window.setInterval(() => {
      setIdx(i => {
        if (i < total - 1) return i + 1;
        setAutoplay(false); // стоп в конце
        return i;
      });
      setFlip(false);
      setRevealCount(0);
    }, 2500);
    return () => {
      if (autoplayRef.current) {
        window.clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
    };
  }, [autoplay, total]);

  // shuffle
  const shuffle = () => {
    setCards(cs => {
      const arr = [...cs];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
    setIdx(0);
    setFlip(false);
    setRevealCount(0);
  };

  // fullscreen
  const rootRef = useRef<HTMLDivElement | null>(null);
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await rootRef.current?.requestFullscreen?.();
      else await document.exitFullscreen();
    } catch {}
  };

  // hint masking (показываем первую букву/несколько букв первого слова перевода)
  const hintText = useMemo(() => {
    if (!card) return '';
    const t = (card.ru_meaning || '').trim();
    if (!t) return '';
    // берём первое слово до пробела/знака препинания
    const m = t.match(/^([A-Za-zА-Яа-яЁёІіЇїЄєҐґ\u0400-\u04FF\-]+)(.*)$/); // кириллица + латиница базово
    const first = m ? m[1] : t.split(/\s+/)[0];
    const rest = m ? m[2] : t.slice(first.length);

    const letters = Array.from(first);
    const shown = Math.min(revealCount, letters.length);
    const masked =
      letters.slice(0, shown).join('') +
      letters.slice(shown).map(ch => (/[A-Za-zА-Яа-яЁёІіЇїЄєҐґ\u0400-\u04FF]/.test(ch) ? '_' : ch)).join('');
    return masked;
  }, [card, revealCount]);

  const countText = useMemo(() => {
    if (!total) return '0 / 0';
    return `${idx + 1} / ${total}`;
  }, [idx, total]);

  const isFav = card ? favSet.has(card.ge_text) : false;

  // click on board: flip (кроме кликов по .no-flip)
  const onBoardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-flip')) return;
    setFlip(f => !f);
  };

  return (
    <main ref={rootRef} className="min-h-screen flex flex-col bg-[#0a0f1b]">
      <TopBar />
      {/* Header */}
      <div className="px-6 pt-2 pb-4 flex items-center justify-between text-neutral-200">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">Карточки ▾</div>
        </div>
        <div className="text-sm opacity-80">{countText}</div>
        <div className="text-sm opacity-90 truncate">{title || episodeId}</div>
      </div>

      {/* Board */}
      <div className="px-6">
        <div
          className="relative rounded-3xl bg-[#2a3344]/50 border border-[#1f2a3a] shadow-inner p-4 md:p-6 overflow-hidden"
          style={{ minHeight: '58vh' }}
          onClick={onBoardClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlip(f => !f); }
          }}
        >
          {/* HINT chip (левый верх) */}
          <button
            className="no-flip inline-flex items-center gap-2 bg-[#0b1220] text-neutral-200 px-3 py-2 rounded-full border border-[#243047] shadow-sm hover:bg-[#0e1726] text-sm"
            onClick={(e) => {
              e.stopPropagation();
              if (!card) return;
              const firstWordLen = (card.ru_meaning || '').trim().split(/\s+/)[0]?.length || 0;
              setRevealCount(c => Math.min(firstWordLen, c + 1));
            }}
            title="Показать подсказку"
          >
            <span>💡</span>
            {revealCount === 0 ? <span>Показать подсказку</span> : <span>{hintText}</span>}
          </button>

          {/* правые иконки (звук-заглушка и избранное) */}
          <div className="no-flip absolute right-4 top-4 flex items-center gap-4 text-neutral-300">
            <button className="hover:opacity-90" title="Произнести">🔊</button>
            {card && (
              <button
                className="hover:opacity-90 text-lg"
                title={isFav ? 'Убрать из избранного' : 'В избранное'}
                onClick={(e) => { e.stopPropagation(); toggleFav(card.ge_text); }}
              >
                {isFav ? '⭐' : '☆'}
              </button>
            )}
          </div>

          {/* center area */}
          <div className="grid place-items-center" style={{ minHeight: '46vh' }}>
            {card ? (
              !flip ? (
                <div
                  className="text-4xl md:text-5xl lg:text-6xl text-neutral-100 select-none"
                  style={{ fontFamily: `'Noto Sans Georgian', 'DejaVu Sans', system-ui, sans-serif` }}
                >
                  {card.ge_text}
                </div>
              ) : (
                <div className="text-3xl md:text-4xl text-neutral-100 select-none">
                  {card.ru_meaning}
                </div>
              )
            ) : (
              <div className="text-neutral-400">Нет карточек</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mt-4 px-6 pb-6">
        <div className="rounded-3xl bg-[#0b1120] border border-[#1f2435] px-4 py-3 flex items-center justify-between">
          <label className="flex items-center gap-2 text-neutral-300 text-sm">
            <span>Отслеживайте прогресс</span>
            <span>
              <input
                type="checkbox"
                className="accent-blue-500"
                checked={trackProgress}
                onChange={(e) => setTrackProgress(e.target.checked)}
              />
            </span>
          </label>

          <div className="flex items-center gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="w-12 h-12 rounded-full bg-[#253048] border border-[#334155] text-neutral-200 hover:bg-[#2b3753] focus:ring-2 focus:ring-blue-400"
              aria-label="Назад"
              disabled={!total || idx === 0}
              title="Назад"
            >←</button>

            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="w-12 h-12 rounded-full bg-[#253048] border border-[#334155] text-neutral-200 hover:bg-[#2b3753] focus:ring-2 focus:ring-blue-400"
              aria-label="Вперёд"
              disabled={!total || idx === total - 1}
              title="Вперёд"
            >→</button>
          </div>

          <div className="flex items-center gap-4 text-neutral-200">
            <button className="hover:opacity-90" onClick={(e)=>{ e.stopPropagation(); shuffle(); }} title="Перемешать">🔀</button>
            <button className="hover:opacity-90" onClick={(e)=>{ e.stopPropagation(); setAutoplay(a=>!a); }} title="Автопролистывание">
              {autoplay ? '⏸' : '▶︎'}
            </button>
            <button className="hover:opacity-90" onClick={(e)=>{ e.stopPropagation(); toggleFullscreen(); }} title="Полный экран">⛶</button>
          </div>
        </div>
      </div>

      {/* Header actions (правый верх) */}
      <div className="fixed right-4 top-[68px] flex gap-2">
        <Link className="btn" href="/">На карту</Link>
        {card && <Link className="btn" href={`/play/${episodeId}`}>Играть «Блоки»</Link>}
      </div>
    </main>
  );
}
