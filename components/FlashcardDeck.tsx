// components/FlashcardDeck.tsx
'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Image from 'next/image';

type Card = {
  id?: string;
  ge_text: string;
  translit?: string;
  ru_meaning?: string;
  type?: 'word' | 'letter';
  level?: number; // 1–3 сложность (используем, если нет topic)
  topic?: string; // тема фразы (location_movement, questions и т.п.)
};

const LS_FAV = 'deda_fav_ge';

// конфиг для тем (подписи и описания)
const TOPIC_CONFIG: Record<string, { label: string; description: string }> = {
  location_movement: {
    label: 'Где / Куда',
    description: 'Фразы про местоположение и движение: здесь, там, идём, остановка.',
  },
  questions: {
    label: 'Вопросы',
    description: 'Кто? Что? Где? Когда? Почему? — базовые вопросительные фразы.',
  },
  time: {
    label: 'Время',
    description: 'Сегодня, завтра, вчера, позже — ориентация во времени.',
  },
  daily_actions: {
    label: 'Дело/быт',
    description: 'Повседневные действия: работаю, читаю, готовлю, пользуюсь чем-то.',
  },
  needs_offers: {
    label: 'Хочу / можно',
    description: 'Хочу, могу, можно, помочь, подождать — выражение потребностей.',
  },
  shopping_places: {
    label: 'Магазин / кафе',
    description: 'Цена, открыто ли, очередь, варианты — всё про сервис и покупки.',
  },
  feelings_reactions: {
    label: 'Чувства / реакция',
    description: 'Нравится, помню, понимаю, забыла, правда? супер! — эмоции и мнение.',
  },
  politeness: {
    label: 'Вежливость',
    description: 'Спасибо, пожалуйста, извините, до свидания — вежливые формулы.',
  },
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
    'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': "ts'", 'ჭ': "ch'", 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h',
  };
  return Array.from(text).map(ch => map[ch] ?? ch).join('');
}

export default function FlashcardDeck({
  cards,
  lessonTitle,
  onTopicChange,
}: {
  cards: Card[];
  lessonTitle?: string;
  onTopicChange?: (topic: string | null) => void;
}) {
  const [isFavoritesPage, setIsFavoritesPage] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsFavoritesPage(/\/study\/favorites\/?$/.test(window.location.pathname));
  }, []);

  const [idx, setIdx] = useState(0);
  const [order, setOrder] = useState<number[]>([]);
  const [flipped, setFlipped] = useState(false);

  // фильтр по сложности (используем только если нет topic)
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [levelInfo, setLevelInfo] = useState<number | null>(null);

  // фильтр по теме
  const [topicFilter, setTopicFilter] = useState<string | null>(null);

  const [favMap, setFavMap] = useState<Record<string, true>>({});

  const [showTranslit, setShowTranslit] = useState(false);
  const [revealCount, setRevealCount] = useState(0);
  const [auto, setAuto] = useState(false);
  const [shuffled, setShuffled] = useState(false);

  const autoRef = useRef<number | null>(null);

  const chipBase =
    'h-8 px-3 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold transition transform duration-200';
  const chipPassive =
    'bg-transparent border border-slate-600/60 text-neutral-300 hover:bg-white/5';
  const chipActive =
    'bg-transparent border border-indigo-400 text-indigo-300';

  const hasTopics = useMemo(
    () => cards.some(c => !!c.topic),
    [cards],
  );

  const hasLevels = useMemo(
    () => !hasTopics && cards.some(c => typeof c.level === 'number'),
    [cards, hasTopics],
  );

  const topics = useMemo(() => {
    if (!hasTopics) return [] as string[];
    const set = new Set<string>();
    cards.forEach(c => {
      if (c.topic) set.add(c.topic);
    });
    return Array.from(set);
  }, [cards, hasTopics]);

  // говорим наружу, какая тема выбрана (или null)
  useEffect(() => {
    if (!onTopicChange) return;
    if (!hasTopics) {
      onTopicChange(null);
    } else {
      onTopicChange(topicFilter);
    }
  }, [topicFilter, hasTopics, onTopicChange]);

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

  const visible = useMemo(() => {
    let base = isFavoritesPage ? cards.filter(c => !!favMap[c.ge_text]) : cards;

    if (hasTopics && topicFilter) {
      base = base.filter(c => c.topic === topicFilter);
    } else if (!hasTopics && hasLevels && levelFilter !== null) {
      base = base.filter(c => (c.level ?? 1) === levelFilter);
    }

    return base;
  }, [cards, favMap, isFavoritesPage, hasTopics, topicFilter, hasLevels, levelFilter]);

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

  const renderLevelDescription = (lvl: number | null) => {
    if (lvl === 1) {
      return 'L1 — супербазовые фразы: короткие, без сложной грамматики.';
    }
    if (lvl === 2) {
      return 'L2 — простые фразы: полные предложения с объектами и обстоятельствами.';
    }
    if (lvl === 3) {
      return 'L3 — фразы посложнее: обобщения, эмоции, более длинные конструкции.';
    }
    return '';
  };

  return (
    <div className="relative w-full">
      {/* Верх: счётчик и заголовок */}
      <div className="mb-4 flex w-full flex-col items-center justify-center gap-2">
        <div className="text-xs tracking-wide text-neutral-400">
          {counter}
        </div>

        {/* Фильтр по темам, если есть topic */}
        {hasTopics && (
          <>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <button
                className={`${chipBase} ${topicFilter === null ? chipActive : chipPassive}`}
                onClick={() => {
                  setTopicFilter(null);
                  setLevelFilter(null);
                  setLevelInfo(null);
                }}
              >
                Все
              </button>
              {topics.map(topic => {
                const cfg = TOPIC_CONFIG[topic];
                return (
                  <button
                    key={topic}
                    className={`${chipBase} ${topicFilter === topic ? chipActive : chipPassive}`}
                    onClick={() => {
                      setTopicFilter(prev => (prev === topic ? null : topic));
                      setLevelFilter(null);
                      setLevelInfo(null);
                    }}
                  >
                    {cfg?.label ?? topic}
                  </button>
                );
              })}
            </div>
            {topicFilter && (
              <div className="mt-1 max-w-xl text-center text-[11px] md:text-xs text-neutral-400">
                {TOPIC_CONFIG[topicFilter]?.description ?? 'Фразы по выбранной теме.'}
              </div>
            )}
          </>
        )}

        {/* Фильтр по уровню сложности — только если нет тем, но есть level */}
        {!hasTopics && hasLevels && (
          <>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <button
                className={`${chipBase} ${levelFilter === null ? chipActive : chipPassive}`}
                onClick={() => {
                  setLevelFilter(null);
                  setLevelInfo(null);
                }}
              >
                Все
              </button>
              {[1, 2, 3].map(lvl => (
                <button
                  key={lvl}
                  className={`${chipBase} ${levelFilter === lvl ? chipActive : chipPassive}`}
                  onClick={() => {
                    setLevelFilter(prev => (prev === lvl ? null : lvl));
                    setLevelInfo(prev => (prev === lvl ? null : lvl));
                  }}
                >
                  L{lvl}
                </button>
              ))}
            </div>
            {levelInfo !== null && (
              <div className="mt-1 max-w-xl text-center text-[11px] md:text-xs text-neutral-400">
                {renderLevelDescription(levelInfo)}
              </div>
            )}
          </>
        )}
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
                className="absolute left-4 top-4 z-10 rounded-full border border-slate-600/60 bg-transparent px-3 py-2 text-base md:text-lg text-neutral-100 hover:bg:white/5 transition-transform duration-200"
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

              {/* Справа сверху: избранное, транслит */}
              <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
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
              <div className="flex flex-col items-center justify:center gap-2">
                <div className="max-w-3xl text-[clamp(22px,3.6vw,38px)] leading-tight text-neutral-100">
                  {card.ru_meaning || '—'}
                </div>
              </div>
            )}
          </div>

          {/* котик внизу слева */}
          <div
            className="pointer-events-none absolute z-[60] hidden select-none md:block"
            style={{
              left: 'max(calc(50% - 640px), 8px)',
              bottom: -180,
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
          <div className="flex items-center gap-12">
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
            <button
              onClick={() => setAuto(a => !a)}
              className={`px-4 py-2 rounded-lg border flex items-center justify-center h-11 min-w-[96px] text-base md:text-lg transition duration-200 ${auto
                ? 'border-indigo-400 text-indigo-300 bg-indigo-900/20'
                : 'border-slate-600/60 text-neutral-100 bg-transparent hover:bg-white/5'
                }`}
              title="Автопрокрутка"
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
              className={`px-4 py-2 rounded-lg border flex items-center justify-center h-11 min-w-[96px] text-base md:text-lg transition duration-200 ${shuffled
                ? 'border-indigo-400 text-indigo-300 bg-indigo-900/20'
                : 'border-slate-600/60 text-neutral-100 bg-transparent hover:bg-white/5'
                }`}
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
