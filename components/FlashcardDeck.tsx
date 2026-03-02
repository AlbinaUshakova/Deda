// components/FlashcardDeck.tsx
'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { pickImageForCard } from '@/lib/imageMap';

type Card = {
  id?: string;
  ge_text: string;
  translit?: string;
  ru_meaning?: string;
  image_url?: string;
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
  const [auto, setAuto] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('deda_auto_play') === '1';
  });
  const [autoSpeedMs, setAutoSpeedMs] = useState(() => {
    if (typeof window === 'undefined') return 2500;
    const raw = localStorage.getItem('deda_auto_speed_ms');
    const parsed = Number(raw);
    return parsed === 1500 || parsed === 2500 || parsed === 4000 ? parsed : 2500;
  });
  const [shuffled, setShuffled] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, true>>({});

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
  const cardImageSrc = useMemo(() => {
    if (!card) return null;
    return pickImageForCard(card);
  }, [card]);
  const imageKey = card?.id || card?.ge_text || '';
  const showCardImage = !!cardImageSrc && !!imageKey && !brokenImages[imageKey];

  const onPrev = useCallback(() => {
    if (!visible.length) return;
    setIdx(i => (i > 0 ? i - 1 : 0));
    setFlipped(false);
    setShowTranslit(false);
    setRevealCount(0);
  }, [visible.length]);

  const onNext = useCallback(() => {
    if (!visible.length) return;
    setIdx(i => (i < visible.length - 1 ? i + 1 : i));
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
    }, autoSpeedMs);
    return () => {
      if (autoRef.current !== null) {
        clearInterval(autoRef.current);
        autoRef.current = null;
      }
    };
  }, [auto, visible.length, autoSpeedMs]);

  useEffect(() => {
    try {
      localStorage.setItem('deda_auto_play', auto ? '1' : '0');
    } catch { }
  }, [auto]);

  useEffect(() => {
    try {
      localStorage.setItem('deda_auto_speed_ms', String(autoSpeedMs));
    } catch { }
  }, [autoSpeedMs]);

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
  const progressPct = total ? Math.round(((idx + 1) / total) * 100) : 0;
  const isFav = !!(card && favMap[card.ge_text]);
  const canPrev = hasCard && idx > 0;
  const canNext = hasCard && idx < total - 1;
  const playControl =
    'h-16 w-16 -translate-y-1 rounded-full border-0 text-slate-950 shadow-[0_0_24px_rgba(251,146,60,0.28)] transition-all duration-150 ease-out hover:scale-[1.06] active:scale-[0.98] flex items-center justify-center text-2xl font-semibold leading-none';
  const shuffleControl =
    'h-8 w-8 rounded-full border-0 bg-transparent text-orange-100/75 opacity-70 transition-all duration-150 ease-out hover:bg-white/8 hover:text-orange-200 hover:opacity-100 hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center text-base leading-none';
  const glassMiniControl =
    'inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-neutral-100 backdrop-blur-[10px] transition-all duration-200 hover:bg-white/[0.06] hover:border-emerald-300/35';

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
        <div className="w-full max-w-[220px]">
          <div className="h-2.5 rounded-full bg-white/16 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/70 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-1 text-center text-xs tracking-wide text-neutral-400">
            {counter}
          </div>
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
      <div className="relative mx-auto w-full max-w-[820px] lg:translate-x-6">
        <div
          className="relative mx-auto rounded-3xl border border-slate-700/60 bg-[#111827] shadow-2xl"
          style={{ height: '48vh', minHeight: 300 }}
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
          {canPrev && (
            <button
              onClick={e => {
                e.stopPropagation();
                onPrev();
              }}
              className="absolute left-3 top-1/2 z-20 -translate-y-1/2 h-12 w-12 rounded-full border border-white/10 bg-white/[0.03] text-neutral-100 backdrop-blur-[10px] transition-all duration-150 ease-out hover:bg-white/[0.06] hover:shadow-[0_0_14px_rgba(148,163,184,0.2)] hover:scale-[1.04] active:scale-[0.98]"
              title="Назад"
              aria-label="Назад"
            >
              <svg className="block -scale-x-100 mx-auto" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {canNext && (
            <button
              onClick={e => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-3 top-1/2 z-20 -translate-y-1/2 h-12 w-12 rounded-full border border-white/10 bg-white/[0.03] text-neutral-100 backdrop-blur-[10px] transition-all duration-150 ease-out hover:bg-white/[0.06] hover:shadow-[0_0_14px_rgba(148,163,184,0.2)] hover:scale-[1.04] active:scale-[0.98]"
              title="Вперёд"
              aria-label="Вперёд"
            >
              <svg className="block mx-auto" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          <div
            className="pointer-events-none absolute inset-0 rounded-3xl opacity-35"
            style={{
              background:
                'radial-gradient(circle at center, rgba(255,255,255,0.04), transparent 60%)',
            }}
          />
          {hasCard && (
            <>
              {/* Подсказка */}
              <button
                className={`group absolute left-4 top-4 z-10 h-10 px-3 text-sm md:text-base ${glassMiniControl} ${revealCount > 0 ? 'bg-emerald-300/12 border-emerald-300/50 text-emerald-200' : ''}`}
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
              >
                <span className="text-xl leading-none">💡</span>
                <span className="ml-1">{revealCount === 0 ? 'подсказка' : hintText}</span>
              </button>

              {/* Справа сверху: избранное, транслит */}
              <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                <button
                  className={`h-10 w-10 text-lg ${glassMiniControl} ${isFav ? 'bg-emerald-300/12 border-emerald-300/50 text-emerald-200' : 'text-neutral-200'}`}
                  onClick={e => {
                    e.stopPropagation();
                    toggleFav(card.ge_text);
                  }}
                  title={isFav ? 'Убрать из избранного' : 'В избранное'}
                >
                  {isFav ? '⭐' : '☆'}
                </button>
                <button
                  className={`h-10 min-w-10 px-3 text-sm md:text-base ${glassMiniControl} ${showTranslit
                    ? 'bg-emerald-300/12 border-emerald-300/50 text-emerald-200'
                    : 'text-neutral-200'
                    }`}
                  onClick={e => {
                    e.stopPropagation();
                    setShowTranslit(v => !v);
                  }}
                  title="Показать транскрипцию"
                >
                  Aa
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
              <div key={`front-${idx}`} className="animate-card-pop flex flex-col items-center justify-center gap-3">
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
              <div key={`back-${idx}`} className="animate-card-pop flex flex-col items-center justify:center gap-3">
                {showCardImage && cardImageSrc && (
                  <img
                    src={cardImageSrc}
                    alt={card.ru_meaning || card.ge_text}
                    className="h-[140px] w-[140px] rounded-2xl object-contain border border-white/10 bg-white/[0.03] p-2"
                    loading="lazy"
                    onError={() => {
                      if (!imageKey) return;
                      setBrokenImages(prev => ({ ...prev, [imageKey]: true }));
                    }}
                  />
                )}
                <div className="max-w-3xl text-[clamp(22px,3.6vw,38px)] leading-tight text-neutral-100">
                  {card.ru_meaning || '—'}
                </div>
              </div>
            )}
          </div>

          {/* котик внизу слева */}
          <div
            className="pointer-events-none absolute z-[30] hidden select-none md:block"
            style={{
              left: 'max(calc(50% - 585px), 8px)',
              bottom: -180,
              pointerEvents: 'none',
            }}
          >
            <Image
              src="/images/deda-cat_2.png"
              alt="Deda cat"
              width={260}
              height={173}
              priority
            />
          </div>
        </div>

        {/* Controls: below card */}
        <div className="mt-4 mx-auto w-full max-w-[820px] flex justify-center px-3 lg:translate-x-6">
          <div
            className="controls origin-center scale-[0.85] inline-flex min-w-[280px] items-center justify-center gap-[12px] rounded-full border border-white/[0.08] px-3 py-2 backdrop-blur-[12px] transition-all duration-200 hover:border-white/[0.12]"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
              boxShadow:
                '0 -10px 40px rgba(0,0,0,0.3), 0 0 40px rgba(80,255,200,0.08)',
            }}
          >
            <button
              onClick={() => {
                setShuffled(s => {
                  const next = !s;
                  setOrder(next ? shuffleArr(order) : visible.map((_, i) => i));
                  return next;
                });
              }}
              className={`${shuffleControl} ${shuffled ? 'text-orange-300 opacity-100' : ''}`}
              title="Перемешать"
              aria-pressed={shuffled}
            >
              <span className="relative inline-flex h-full w-full items-center justify-center">
                <span>⇄</span>
                {shuffled && (
                  <span className="absolute -bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-orange-300" />
                )}
              </span>
            </button>

            <button
              onClick={() => setAuto(a => !a)}
              className={`${playControl} ${auto ? 'animate-play-pulse scale-[1.02] ring-2 ring-orange-300/45 shadow-[0_8px_24px_rgba(0,0,0,0.35),0_0_20px_rgba(251,146,60,0.32)]' : ''}`}
              title="Автопрокрутка"
              aria-pressed={auto}
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.22), transparent 45%), #f59e0b',
              }}
            >
              {auto ? <span className="leading-none">Ⅱ</span> : <span className="leading-none translate-x-[1px]">▶</span>}
            </button>

            <select
              value={autoSpeedMs}
              onChange={e => setAutoSpeedMs(Number(e.target.value))}
              className="h-8 min-w-[96px] rounded-xl border border-white/10 bg-[#141928]/90 px-2.5 pr-6 text-[13px] font-medium text-white/85 outline-none backdrop-blur-[16px] transition-all duration-150 hover:border-orange-300/45 hover:bg-[#18203a] focus:border-orange-300/65 focus:shadow-[0_0_0_1px_rgba(251,146,60,0.28),0_0_12px_rgba(251,146,60,0.22)]"
              aria-label="Скорость автопрокрутки"
            >
              <option value={1500}>⚡1.5×</option>
              <option value={2500}>⚡2.5×</option>
              <option value={4000}>⚡4×</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
