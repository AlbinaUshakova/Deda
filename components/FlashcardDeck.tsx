// components/FlashcardDeck.tsx
'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Image from 'next/image';

type Card = {
  id?: string;
  ge_text: string;
  translit?: string;
  ru_meaning?: string;
  audio_url?: string;
  type?: 'word' | 'letter';
};

const LS_FAV = 'deda_fav_ge';

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
    'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': "ts'", 'ჭ': "ch'", 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h',
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
  // определяем, что мы на странице избранного
  const [isFavoritesPage, setIsFavoritesPage] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsFavoritesPage(/\/study\/favorites\/?$/.test(window.location.pathname));
  }, []);

  // состояние
  const [idx, setIdx] = useState(0);
  const [order, setOrder] = useState<number[]>([]);
  const [flipped, setFlipped] = useState(false);

  // избранное (ключ — ge_text)
  const [favMap, setFavMap] = useState<Record<string, true>>({});

  // транскрипция / подсказка / авто / перемешано
  const [showTranslit, setShowTranslit] = useState(false);
  const [revealCount, setRevealCount] = useState(0);
  const [auto, setAuto] = useState(false);
  const [shuffled, setShuffled] = useState(false);

  const autoRef = useRef<number | null>(null);

  // стили круглых кнопок
  const chipBase =
    'w-16 h-16 rounded-full flex items-center justify-center text-base font-semibold transition transform duration-200';
  const chipPassive =
    'bg-transparent border border-slate-600/60 text-neutral-100 hover:bg-white/5';
  const chipActive =
    'bg-transparent border border-indigo-400 text-indigo-300';

  // загрузка избранного
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_FAV);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        const map: Record<string, true> = {};
        arr.forEach(ge => (map[ge] = true));
        setFavMap(map);
      }
    } catch { }
  }, []);

  // список видимых карточек:
  // - на favorites — только отмеченные
  // - везде остальное — без фильтра
  const visible = useMemo(() => {
    return isFavoritesPage ? cards.filter(c => !!favMap[c.ge_text]) : cards;
  }, [cards, favMap, isFavoritesPage]);

  // сброс при смене набора/фильтра
  useEffect(() => {
    setOrder(visible.map((_, i) => i));
    setIdx(0);
    setFlipped(false);
    setShowTranslit(false);
    setRevealCount(0);
    setShuffled(false);
  }, [visible]);

  const card = visible[order[idx]];
  const hasCard = !!card;

  // автоозвучка
  useEffect(() => {
    if (card?.audio_url && !flipped) {
      try {
        new Audio(card.audio_url).play().catch(() => { });
      } catch { }
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

  // избранное
  const persistFav = useCallback((map: Record<string, true>) => {
    try {
      localStorage.setItem(LS_FAV, JSON.stringify(Object.keys(map)));
    } catch { }
  }, []);

  const toggleFav = useCallback(
    (ge: string) => {
      setFavMap(prev => {
        const next = { ...prev };
        if (next[ge]) delete next[ge];
        else next[ge] = true;
        persistFav(next);
        return next;
      });
    },
    [persistFav],
  );

  // хоткеи
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === ' ') {
        e.preventDefault();
        hasCard && setFlipped(f => !f);
      } else if (e.key.toLowerCase() === 's' && hasCard && card) {
        toggleFav(card.ge_text);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onPrev, onNext, hasCard, card, toggleFav]);

  // автопросмотр
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

  // подсказка (посимвольно по всей фразе)
  const hintText = useMemo(() => {
    if (!card) return '';
    const t = (card.ru_meaning || '').trim();
    if (!t) return '';
    const chars = Array.from(t);
    const shown = Math.min(revealCount, chars.length);
    return chars
      .map((ch, i) => {
        const isLetter =
          /[A-Za-zА-Яа-яЁёІіЇїЄєҐґ\u0400-\u04FF]/.test(ch);
        return i < shown ? ch : isLetter ? '_' : ch;
      })
      .join('');
  }, [card, revealCount]);

  const total = visible.length;
  const counter = total ? `${idx + 1} / ${total}` : '0 / 0';
  const isFav = !!(card && favMap[card.ge_text]);

  return (
    <div className="relative w-full">
      {/* Верх: счётчик и заголовок */}
      <div className="mb-4 flex w-full flex-col items-center justify-center gap-2">
        <div className="text-xs tracking-wide text-neutral-400">
          {counter}
        </div>
        <div className="text-xl font-semibold text-neutral-200">
          {lessonTitle}
        </div>
      </div>

      {/* Карточка */}
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
              {/* Подсказка */}
              <button
                className="absolute left-4 top-4 z-10 rounded-full border border-slate-600/60 bg-transparent px-3 py-2 text-base md:text-lg text-neutral-100 hover:bg-white/5 transition-transform duration-200"
                onClick={e => {
                  e.stopPropagation();
                  const t = (card?.ru_meaning || '').trim();
                  if (!t) return;
                  setRevealCount(c => Math.min(t.length, c + 1));
                }}
                onContextMenu={e => {
                  e.preventDefault();
                  setRevealCount(0);
                }}
                title="Показать подсказку"
              >
                💡 {revealCount === 0 ? 'подсказка' : hintText}
              </button>

              {/* Справа сверху: звук, избранное, транслит */}
              <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                <button
                  className="w-14 h-14 rounded-full border border-slate-600/60 bg-transparent flex items-center justify-center text-xl md:text-2xl text-neutral-100 hover:bg-white/5 transition-transform duration-200"
                  onClick={e => {
                    e.stopPropagation();
                    if (!card!.audio_url) return;
                    try {
                      new Audio(card!.audio_url).play().catch(() => { });
                    } catch { }
                  }}
                  title="Произнести"
                >
                  🔊
                </button>
                <button
                  className="w-14 h-14 rounded-full border border-slate-600/60 bg-transparent flex items-center justify-center text-xl md:text-2xl text-neutral-100 hover:bg-white/5 transition-transform duration-200"
                  onClick={e => {
                    e.stopPropagation();
                    toggleFav(card.ge_text);
                  }}
                  title={isFav ? 'Убрать из избранного' : 'В избранное'}
                >
                  {isFav ? '⭐' : '☆'}
                </button>
                <button
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-lg md:text-xl border transition duration-200 ${showTranslit
                    ? 'border-emerald-400 text-emerald-300 bg-transparent'
                    : 'border-slate-600/60 text-neutral-100 bg-transparent hover:bg-white/5'
                    }`}
                  onClick={e => {
                    e.stopPropagation();
                    setShowTranslit(v => !v);
                  }}
                  title="Показать транскрипцию"
                >
                  abc
                </button>
              </div>
            </>
          )}

          {/* Контент */}
          <div className="grid h-full w-full select-none place-items-center px-6 text-center">
            {!hasCard ? (
              <div className="text-neutral-400">
                {isFavoritesPage
                  ? 'Нет отмеченных карточек'
                  : 'Нет карточек'}
              </div>
            ) : !flipped ? (
              <div className="flex flex-col items-center justify-center gap-3">
                <div
                  className="text-[clamp(32px,5.5vw,64px)] leading-tight text-neutral-100"
                  style={{
                    fontFamily:
                      "'Noto Sans Georgian','DejaVu Sans',system-ui,sans-serif",
                  }}
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
                <div className="max-w-3xl text-[clamp(22px,3.6vw,38px)] leading-tight text-neutral-100">
                  {card.ru_meaning || '—'}
                </div>
              </div>
            )}
          </div>

          {/* котик внизу слева (показывается на md+). Помещён внутри relative-контейнера карточки */}
          <div
            className="pointer-events-none absolute z-[60] hidden select-none md:block"
            style={{
              left: 'max(calc(50% - 640px), 8px)',
              // ещё ниже — больше выступает за пределы карточки
              bottom: -180, // увеличено, чтобы кот был глубже под карточкой
              pointerEvents: 'none',
            }}
          >
            <Image
              src="/images/deda-cat_2.png"
              alt="Deda cat"
              width={300}
              height={200}
              priority
            />
          </div>
        </div>

        {/* Низ: стрелки и опции */}
        <div className="mt-4 flex items-center justify-between">
          <div className="w-24" />
          <div className="flex items-center gap-12"> {/* увеличено расстояние между стрелками */}
            <button
              onClick={onPrev}
              disabled={!hasCard}
              className="h-16 w-16 rounded-full border border-slate-600/60 bg-transparent text-neutral-100 hover:scale-105 disabled:opacity-40 transition-transform duration-200 flex items-center justify-center"
              title="Назад"
              aria-label="Назад"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              onClick={onNext}
              disabled={!hasCard}
              className="h-16 w-16 rounded-full border border-slate-600/60 bg-transparent text-neutral-100 hover:scale-105 disabled:opacity-40 transition-transform duration-200 flex items-center justify-center"
              title="Вперёд"
              aria-label="Вперёд"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="w-24 flex items-center justify-end gap-3">
            {/* одинаковый базовый размер/вёрстка для обеих кнопок */}
            <button
              onClick={() => setAuto(a => !a)}
              className={`px-4 py-2 rounded-lg border flex items-center justify-center h-11 min-w-[96px] text-base md:text-lg transition duration-200 ${auto ? 'border-indigo-400 text-indigo-300 bg-indigo-900/20' : 'border-slate-600/60 text-neutral-100 bg-transparent hover:bg-white/5'}`}
              title="Воспроизвести"
            >
              <img src="/icons/play1.png" alt="Auto" className="w-10 h-10 opacity-90" />
            </button>

            <button
              onClick={() => {
                setShuffled(s => {
                  const next = !s;
                  setOrder(next ? shuffleArr(order) : visible.map((_, i) => i));
                  return next;
                });
              }}
              className={`px-4 py-2 rounded-lg border flex items-center justify-center h-11 min-w-[96px] text-base md:text-lg transition duration-200 ${shuffled ? 'border-indigo-400 text-indigo-300 bg-indigo-900/20' : 'border-slate-600/60 text-neutral-100 bg-transparent hover:bg-white/5'}`}
              title="Перемешать"
              aria-pressed={shuffled}
            >
              <img src="/icons/shuffle1.png" alt="Shuffle" className="w-10 h-10 opacity-90" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
