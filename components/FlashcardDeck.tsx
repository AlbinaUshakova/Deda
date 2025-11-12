// components/FlashcardDeck.tsx
'use client';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Image from 'next/image';

type Card = {
  id: string;
  ge_text: string;
  translit?: string;
  ru_meaning?: string;
  audio_url?: string;
  type?: 'word' | 'letter';
};

function shuffleArr<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function geToTranslit(text: string): string {
  const map: Record<string, string> = {
    'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z', 'თ': 't',
    'ი': 'i', 'კ': "k'", 'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o', 'პ': "p'", 'ჟ': 'zh',
    'რ': 'r', 'ს': 's', 'ტ': "t'", 'უ': 'u', 'ფ': 'p', 'ქ': 'k', 'ღ': 'gh', 'ყ': "q'",
    'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': "ts'", 'ჭ': "ch'", 'ხ': 'kh',
    'ჯ': 'j', 'ჰ': 'h',
  };
  return Array.from(text).map(ch => map[ch] ?? ch).join('');
}

export default function FlashcardDeck({
  cards,
  lessonTitle,
}: {
  cards: Card[];
  lessonTitle?: string;
}) {
  const [idx, setIdx] = useState(0);
  const [order, setOrder] = useState<number[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [starred, setStarred] = useState<Record<string, boolean>>({});
  const [showTranslit, setShowTranslit] = useState(false);
  const [revealCount, setRevealCount] = useState(0);
  const [auto, setAuto] = useState(false);
  const autoRef = useRef<number | null>(null);

  const visible = useMemo(() => cards, [cards]);

  useEffect(() => {
    setOrder(visible.map((_, i) => i));
    setIdx(0);
    setFlipped(false);
    setShowTranslit(false);
    setRevealCount(0);
  }, [visible]);

  const card = visible[order[idx]];
  const hasCard = !!card;

  useEffect(() => {
    if (card?.audio_url && !flipped) {
      try { new Audio(card.audio_url).play().catch(() => { }); } catch { }
    }
  }, [idx, flipped, card]);

  const onPrev = useCallback(() => {
    if (!visible.length) return;
    setIdx(i => (i > 0 ? i - 1 : visible.length - 1));
    setFlipped(false);
    setShowTranslit(false);
    setRevealCount(0);
  }, [visible.length]);

  const onNext = useCallback(() => {
    if (!visible.length) return;
    setIdx(i => (i + 1) % visible.length);
    setFlipped(false);
    setShowTranslit(false);
    setRevealCount(0);
  }, [visible.length]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === ' ') { e.preventDefault(); hasCard && setFlipped(f => !f); }
      else if (e.key.toLowerCase() === 's' && hasCard) {
        setStarred(s => ({ ...s, [card!.id]: !s[card!.id] }));
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onPrev, onNext, hasCard, card]);

  useEffect(() => {
    if (!auto || !visible.length) {
      if (autoRef.current !== null) {
        clearInterval(autoRef.current);
        autoRef.current = null;
      }
      return;
    }
    autoRef.current = window.setInterval(() => {
      setIdx(i => (i + 1) % visible.length);
      setFlipped(false);
      setShowTranslit(false);
      setRevealCount(0);
    }, 2500);
    return () => {
      if (autoRef.current !== null) {
        clearInterval(autoRef.current);
        autoRef.current = null;
      }
    };
  }, [auto, visible.length]);

  // подсказка посимвольно по всему переводу
  const hintText = useMemo(() => {
    if (!card) return '';
    const t = (card.ru_meaning || '').trim();
    if (!t) return '';
    const chars = Array.from(t);
    const shown = Math.min(revealCount, chars.length);
    return chars
      .map((ch, i) => {
        const isLetter = /[A-Za-zА-Яа-яЁёІіЇїЄєҐґ\u0400-\u04FF]/.test(ch);
        return i < shown ? ch : (isLetter ? '_' : ch);
      })
      .join('');
  }, [card, revealCount]);

  const chip = 'w-11 h-11 rounded-full border flex items-center justify-center text-sm';
  const chipPassive = 'border-slate-600/60 bg-black/30 hover:bg-black/40 text-neutral-200';
  const chipActive = 'border-indigo-400 bg-indigo-500/20 text-indigo-200';

  const total = visible.length;
  const counter = total ? `${idx + 1} / ${total}` : '0 / 0';

  return (
    <div className="relative w-full">
      {/* верх: счётчик и название урока */}
      <div className="mb-4 flex w-full flex-col items-center justify-center">
        <div className="text-xs tracking-wide text-neutral-400">{counter}</div>
        <div className="text-xl font-semibold text-neutral-200">{lessonTitle}</div>
      </div>

      {/* карточка */}
      <div className="mx-auto w-full max-w-[1000px]">
        <div
          className="relative mx-auto rounded-3xl border border-slate-700/60 bg-[#111827] shadow-2xl"
          style={{ height: '56vh', minHeight: 340 }}
          onClick={() => hasCard && setFlipped(f => !f)}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              hasCard && setFlipped(f => !f);
            }
          }}
        >
          {hasCard && (
            <>
              {/* подсказка слева сверху */}
              <button
                className="absolute left-4 top-4 z-10 rounded-full border border-slate-600/60 bg-black/30 px-3 py-1 text-xs text-neutral-200 hover:bg-black/40"
                onClick={e => {
                  e.stopPropagation();
                  const t = (card?.ru_meaning || '').trim();
                  if (!t) return;
                  setRevealCount(c => Math.min(t.length, c + 1));
                }}
                onContextMenu={e => { e.preventDefault(); setRevealCount(0); }}
                title="Показать подсказку"
              >
                💡 {revealCount === 0 ? 'подсказка' : hintText}
              </button>

              {/* справа сверху: звук, избранное, транскрипция */}
              <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                <button
                  className="rounded-full border border-slate-600/60 bg-black/30 px-2 py-1 text-xs text-neutral-200 hover:bg-black/40"
                  onClick={e => {
                    e.stopPropagation();
                    if (!card!.audio_url) return;
                    try { new Audio(card!.audio_url).play().catch(() => { }); } catch { }
                  }}
                  title="Произнести"
                >
                  🔊
                </button>
                <button
                  className="rounded-full border border-slate-600/60 bg-black/30 px-2 py-1 text-xs text-neutral-200 hover:bg-black/40"
                  onClick={e => {
                    e.stopPropagation();
                    setStarred(s => ({ ...s, [card!.id]: !s[card!.id] }));
                  }}
                  title={starred[card!.id] ? 'Убрать из избранного' : 'В избранное'}
                >
                  {starred[card!.id] ? '⭐' : '☆'}
                </button>
                <button
                  className={`rounded-full px-2 py-1 text-xs border ${showTranslit
                    ? 'border-emerald-400 text-emerald-300 bg-emerald-900/20'
                    : 'border-slate-600/60 text-neutral-200 bg-black/30 hover:bg-black/40'
                    }`}
                  onClick={e => { e.stopPropagation(); setShowTranslit(v => !v); }}
                  title="Показать транскрипцию"
                >
                  abc
                </button>
              </div>
            </>
          )}

          {/* содержимое */}
          <div className="grid h-full w-full place-items-center px-6 text-center select-none">
            {!hasCard ? (
              <div className="text-neutral-400">Нет карточек</div>
            ) : !flipped ? (
              <div className="flex flex-col items-center justify-center gap-3">
                <div
                  className="text-[clamp(32px,5.5vw,64px)] leading-tight text-neutral-100"
                  style={{ fontFamily: "'Noto Sans Georgian','DejaVu Sans',system-ui,sans-serif" }}
                >
                  {card.ge_text}
                </div>
                {showTranslit && (
                  <div className="text-[clamp(16px,2vw,22px)] text-emerald-300/90">
                    {card.translit && card.translit.trim()
                      ? card.translit
                      : geToTranslit(card.ge_text)}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="text-[clamp(22px,3.6vw,38px)] leading-tight text-neutral-100 max-w-3xl">
                  {card.ru_meaning || '—'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* низ: стрелки и опции */}
        <div className="mt-4 flex items-center justify-between">
          <div className="w-24" />
          <div className="flex items-center gap-3">
            <button
              onClick={onPrev}
              disabled={!hasCard}
              className="w-14 h-14 rounded-full border border-slate-600/60 bg-[#0b1120]/60 text-lg hover:bg-[#111827] text-neutral-200 disabled:opacity-40"
              title="Назад"
            >
              ←
            </button>
            <button
              onClick={onNext}
              disabled={!hasCard}
              className="w-14 h-14 rounded-full border border-slate-600/60 bg-[#0b1120]/60 text-lg hover:bg-[#111827] text-neutral-200 disabled:opacity-40"
              title="Вперёд"
            >
              →
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAuto(a => !a)}
              disabled={!visible.length}
              className={`${chip} ${auto ? chipActive : chipPassive}`}
              title="Автопросмотр"
            >
              {auto ? '⏸' : '▶︎'}
            </button>
            <button
              onClick={() => {
                setOrder(o => shuffleArr(o));
                setIdx(0);
                setFlipped(false);
                setShowTranslit(false);
                setRevealCount(0);
              }}
              disabled={!visible.length}
              className={`${chip} ${chipPassive}`}
              title="Перемешать"
            >
              🔀
            </button>
          </div>
        </div>
      </div>

      {/* котик слева снизу у карточки */}
      <div
        className="absolute bottom-4 z-[60] pointer-events-none select-none hidden md:block"
        // 1000px — максимальная ширина карточки; 20px — зазор от карточки
        style={{ left: 'max(calc(50% - 520px), 8px)' }}
      >
        <Image
          src="/images/deda-cat_2.png"
          alt="Deda cat"
          width={220}
          height={220}
          priority
        />
      </div>
    </div>
  );
}
