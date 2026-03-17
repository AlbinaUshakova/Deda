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

function splitDialogLines(text: string): string[] {
  return String(text || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
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
  const [progressStep, setProgressStep] = useState(0);
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
  const [autoSpeedMs, setAutoSpeedMs] = useState(1500);
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, true>>({});
  const [imageLoadState, setImageLoadState] = useState<Record<string, 'loaded' | 'error'>>({});

  const autoRef = useRef<number | null>(null);
  const speedMenuRef = useRef<HTMLDivElement | null>(null);

  const chipBase =
    'h-8 px-3 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold transition transform duration-200';
  const chipPassive =
    'bg-white border border-slate-300 text-[var(--text-secondary)] hover:bg-slate-50 hover:text-[var(--text-primary)]';
  const chipActive =
    'bg-indigo-50 border border-indigo-400 text-indigo-700';

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
    setProgressStep(visible.length ? 1 : 0);
    setFlipped(false);
    setShowTranslit(false);
    setRevealCount(0);
    setShuffled(false);
  }, [visible]);

  const card = visible[order[idx]];
  const hasCard = !!card;
  const geDialogLines = splitDialogLines(card?.ge_text || '');
  const ruDialogLines = splitDialogLines(card?.ru_meaning || '');
  const isGeDialog = geDialogLines.length > 1;
  const isRuDialog = ruDialogLines.length > 1;
  const translitDialogLines = splitDialogLines(
    card?.translit && card.translit.trim()
      ? card.translit
      : geToTranslit(card?.ge_text || ''),
  );
  const cardImageSrc = useMemo(() => {
    if (!card) return null;
    return pickImageForCard(card);
  }, [card]);
  const imageKey = card?.id || card?.ge_text || '';
  const imageStateKey = cardImageSrc && imageKey ? `${imageKey}::${cardImageSrc}` : '';
  const imageState = imageStateKey ? imageLoadState[imageStateKey] : undefined;
  const canAttemptCardImage = !!cardImageSrc && !!imageKey && !brokenImages[imageKey];
  const showCardImage = canAttemptCardImage && imageState === 'loaded';

  const onPrev = useCallback(() => {
    if (!visible.length) return;
    setIdx(i => {
      const wrapped = i <= 0;
      const nextIdx = wrapped ? visible.length - 1 : i - 1;
      setProgressStep(wrapped ? visible.length : nextIdx + 1);
      return nextIdx;
    });
    setFlipped(false);
    setShowTranslit(false);
    setRevealCount(0);
  }, [visible.length]);

  const onNext = useCallback(() => {
    if (!visible.length) return;
    setIdx(i => {
      if (i >= visible.length - 1) {
        setProgressStep(0);
        return 0;
      }
      const nextIdx = i + 1;
      setProgressStep(nextIdx + 1);
      return nextIdx;
    });
    setFlipped(false);
    setShowTranslit(false);
    setRevealCount(0);
  }, [visible.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'BUTTON' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        if (!hasCard) return;
        e.preventDefault();
        setFlipped(f => !f);
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasCard, onNext, onPrev]);

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
      setIdx(i => {
        const wrapped = i + 1 >= visible.length;
        const nextIdx = wrapped ? 0 : i + 1;
        setProgressStep(wrapped ? 0 : nextIdx + 1);
        return nextIdx;
      });
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
      const autoRaw = localStorage.getItem('deda_auto_play');
      setAuto(autoRaw === '1');

      const speedRaw = localStorage.getItem('deda_auto_speed_ms');
      const speedParsed = Number(speedRaw);
      if (speedParsed === 1500 || speedParsed === 2500 || speedParsed === 4000) {
        setAutoSpeedMs(speedParsed);
      }
    } catch { }
    setPrefsHydrated(true);
  }, []);

  useEffect(() => {
    if (!prefsHydrated) return;
    try {
      localStorage.setItem('deda_auto_play', auto ? '1' : '0');
    } catch { }
  }, [auto, prefsHydrated]);

  useEffect(() => {
    if (!prefsHydrated) return;
    try {
      localStorage.setItem('deda_auto_speed_ms', String(autoSpeedMs));
    } catch { }
  }, [autoSpeedMs, prefsHydrated]);

  useEffect(() => {
    if (!prefsHydrated) return;
    setSpeedMenuOpen(false);
  }, [prefsHydrated]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!speedMenuRef.current) return;
      if (!speedMenuRef.current.contains(e.target as Node)) {
        setSpeedMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const hintText = useMemo(() => {
    if (!card) return '';
    const t = (card.ru_meaning || '').trim();
    if (!t) return '';
    const chars = Array.from(t);
    const shownLetters = Math.min(
      revealCount,
      chars.filter(ch => /[A-Za-zА-Яа-яЁёІіЇїЄєҐґ\u0400-\u04FF]/.test(ch)).length,
    );
    let revealedLetters = 0;
    return chars
      .map(ch => {
        const isLetter =
          /[A-Za-zА-Яа-яЁёІіЇїЄєҐґ\u0400-\u04FF]/.test(ch);
        if (!isLetter) return ch;
        if (revealedLetters < shownLetters) {
          revealedLetters += 1;
          return ch;
        }
        return '_';
      })
      .join('');
  }, [card, revealCount]);

  const total = visible.length;
  const counter = total ? `${idx + 1} / ${total}` : '0 / 0';
  const isFav = !!(card && favMap[card.ge_text]);
  const canPrev = hasCard && total > 1;
  const canNext = hasCard && total > 1;
  const playControl =
    'h-[clamp(24px,5.9vw,44px)] w-[clamp(24px,5.9vw,44px)] rounded-full border-0 bg-transparent text-current opacity-100 transition-all duration-200 ease-out hover:scale-[1.05] active:scale-[0.97] flex items-center justify-center text-[clamp(18px,4.8vw,29px)] font-light leading-none';
  const shuffleControl =
    'h-[clamp(24px,5.9vw,44px)] w-[clamp(24px,5.9vw,44px)] rounded-full border-0 bg-transparent text-current opacity-100 transition-all duration-200 ease-out hover:scale-[1.05] active:scale-[0.97] flex items-center justify-center text-[clamp(20px,5.1vw,31px)] font-light leading-none';
  const glassMiniControl =
    'inline-flex items-center justify-center rounded-xl border-0 bg-transparent text-[var(--text-primary)] shadow-none transition-all duration-200';
  const navLikeMiniControl =
    'inline-flex items-center justify-center rounded-xl border-0 bg-transparent text-[var(--text-primary)] shadow-none transition-all duration-200 hover:text-[var(--text-primary)] active:scale-[0.98]';
  const speedOptions = [
    { value: 1500, label: '1.5x' },
    { value: 2500, label: '2.5x' },
    { value: 4000, label: '4x' },
  ] as const;
  const currentSpeedLabel = speedOptions.find(o => o.value === autoSpeedMs)?.label ?? '1.5x';

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
    <div className="flashcard-screen-root relative w-full min-w-0">
      {/* Верх: счётчик и заголовок */}
      <div className="mb-1 flex w-full flex-col items-center justify-center gap-1.5">
        <div className="w-full max-w-[860px] px-3 sm:px-4 md:px-0">
          <div className="flashcard-counter text-center text-xs max-[900px]:text-[11px] tracking-wide text-[var(--text-secondary)] opacity-70">
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
              <div className="mt-1 max-w-xl text-center text-[11px] md:text-xs text-[var(--text-secondary)]">
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
              <div className="mt-1 max-w-xl text-center text-[11px] md:text-xs text-[var(--text-secondary)]">
                {renderLevelDescription(levelInfo)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Карточка */}
      <div className="flashcard-stage relative mx-auto flex w-full max-w-[900px] flex-col items-center justify-center px-[clamp(14px,3.6vw,40px)] pt-[clamp(8px,1.4vh,18px)] pb-[clamp(24px,4vh,44px)]">
        {canPrev && (
          <button
            onClick={e => {
              e.stopPropagation();
              onPrev();
            }}
            className="flashcard-nav-arrow flashcard-nav-arrow--outside absolute top-1/2 z-20 hidden -translate-y-1/2 min-[1201px]:inline-flex items-center justify-center h-13 w-13 rounded-full border-0 bg-transparent text-[var(--text-secondary)] shadow-none transition-all duration-150 ease-out hover:scale-[1.04] active:scale-[0.98]"
            style={{ left: 'calc(50% - 320px - 54px)' }}
            title="Назад"
            aria-label="Назад"
          >
            <svg className="block -scale-x-100 mx-auto" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        {canNext && (
          <button
            onClick={e => {
              e.stopPropagation();
              onNext();
            }}
            className="flashcard-next-btn flashcard-nav-arrow flashcard-nav-arrow--outside absolute top-1/2 z-20 hidden -translate-y-1/2 min-[1201px]:inline-flex items-center justify-center h-13 w-13 rounded-full border-0 bg-transparent text-[var(--text-secondary)] shadow-none transition-all duration-150 ease-out hover:scale-[1.04] active:scale-[0.98]"
            style={{ right: 'calc(50% - 320px - 54px)' }}
            title="Вперёд"
            aria-label="Вперёд"
          >
            <svg className="block mx-auto" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        <div
          className={`flashcard-main-card group relative z-10 mx-auto cursor-pointer rounded-3xl border border-slate-200 bg-white ${
            flipped ? 'flashcard-main-card--flipped' : ''
          }`}
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
              className="flashcard-nav-arrow flashcard-nav-arrow--inside absolute left-[-44px] top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-transparent text-[var(--text-secondary)] shadow-none transition-all duration-150 ease-out hover:scale-[1.04] active:scale-[0.98] max-[640px]:left-[-36px] min-[1201px]:hidden"
              title="Назад"
              aria-label="Назад"
            >
              <svg className="block -scale-x-100 mx-auto" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {canNext && (
            <button
              onClick={e => {
                e.stopPropagation();
                onNext();
              }}
              className="flashcard-next-btn flashcard-nav-arrow flashcard-nav-arrow--inside absolute right-[-44px] top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-transparent text-[var(--text-secondary)] shadow-none transition-all duration-150 ease-out hover:scale-[1.04] active:scale-[0.98] max-[640px]:right-[-36px] min-[1201px]:hidden"
              title="Вперёд"
              aria-label="Вперёд"
            >
              <svg className="block mx-auto" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {hasCard && (
            <>
              {/* Подсказка */}
              <button
                className={`flashcard-hint-btn flashcard-secondary-label flashcard-top-muted flashcard-mini-btn group absolute left-[clamp(24px,2.2vw,28px)] top-[clamp(20px,2vw,24px)] z-10 h-8 px-2 text-[11px] md:text-xs ${navLikeMiniControl}`}
                onClick={e => {
                  e.stopPropagation();
                  const t = (card?.ru_meaning || '').trim();
                  if (!t) return;
                  const lettersTotal = Array.from(t).filter(ch =>
                    /[A-Za-zА-Яа-яЁёІіЇїЄєҐґ\u0400-\u04FF]/.test(ch),
                  ).length;
                  setRevealCount(c => Math.min(lettersTotal, c + 1));
                }}
                onContextMenu={e => {
                  e.preventDefault();
                  setRevealCount(0);
                }}
                aria-pressed={revealCount > 0}
              >
                <span className="text-[13px] leading-none">💡</span>
                {revealCount === 0 ? (
                  <span className="flashcard-hint-label ml-1">подсказка</span>
                ) : (
                  <span className="flashcard-hint-value ml-1">{hintText}</span>
                )}
              </button>

              {/* Справа сверху: избранное, транслит */}
              <div className="absolute right-[clamp(24px,2.2vw,28px)] top-[clamp(20px,2vw,24px)] z-10 flex items-center gap-2">
                <button
                  className={`flashcard-favorite-btn flashcard-top-muted flashcard-mini-btn h-6 w-6 text-[13px] ${navLikeMiniControl}`}
                  onClick={e => {
                    e.stopPropagation();
                    toggleFav(card.ge_text);
                  }}
                  title={isFav ? 'Убрать из избранного' : 'В избранное'}
                  aria-pressed={isFav}
                >
                  {isFav ? '⭐' : '☆'}
                </button>
                <button
                  className={`flashcard-top-muted flashcard-mini-btn flashcard-translit-btn h-6 min-w-6 px-1 text-[10px] md:text-[11px] ${navLikeMiniControl}`}
                  onClick={e => {
                    e.stopPropagation();
                    setShowTranslit(v => !v);
                  }}
                  title="Показать транскрипцию"
                  aria-pressed={showTranslit}
                >
                  Aa
                </button>
              </div>

            </>
          )}

          {/* Контент */}
          <div className="flashcard-content grid h-full w-full select-none place-items-center text-center">
            {!hasCard ? (
              <div className="text-[var(--text-secondary)]">
                {isFavoritesPage
                  ? 'Нет отмеченных карточек'
                  : 'Нет карточек'}
              </div>
            ) : !flipped ? (
              <div key={`front-${idx}`} className="flex -translate-y-[23px] flex-col items-center justify-center gap-3">
                <div
                  className="flashcard-ge-text mx-auto max-w-[20ch] whitespace-normal break-words text-[clamp(34px,5vw,56px)] leading-[1.12] tracking-[0.012em] text-slate-800"
                  style={{
                    fontFamily:
                      "'Noto Sans Georgian','DejaVu Sans',system-ui,sans-serif",
                  }}
                >
                  {isGeDialog ? (
                    <div className="flex flex-col items-center gap-2">
                      {geDialogLines.map((line, lineIdx) => (
                        <div
                          key={`${line}-${lineIdx}`}
                          className={`flashcard-dialog-line ${
                            lineIdx === 0 ? 'flashcard-dialog-line--question' : 'flashcard-dialog-line--answer'
                          }`}
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  ) : (
                    card.ge_text
                  )}
                </div>
                {showTranslit && (
                  <div className="text-[clamp(16px,2vw,22px)] text-emerald-600/90">
                    {isGeDialog && translitDialogLines.length > 1 ? (
                      <div className="flex flex-col items-center gap-1.5">
                        {translitDialogLines.map((line, lineIdx) => (
                          <div
                            key={`${line}-${lineIdx}`}
                            className={`flashcard-dialog-line ${
                              lineIdx === 0 ? 'flashcard-dialog-line--question' : 'flashcard-dialog-line--answer'
                            }`}
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                    ) : (
                      card.translit && card.translit.trim()
                        ? card.translit
                        : geToTranslit(card.ge_text)
            )}
          </div>
        )}
      </div>
    ) : (
      <div key={`back-${idx}`} className="flex -translate-y-[23px] flex-col items-center justify:center gap-3">
        <div className="flashcard-ru-text mx-auto max-w-[20ch] whitespace-normal break-words text-[clamp(30px,5vw,48px)] leading-tight text-[var(--text-primary)]">
          {isRuDialog ? (
            <div className="flex flex-col items-center gap-1.5">
              {ruDialogLines.map((line, lineIdx) => (
                <div
                          key={`${line}-${lineIdx}`}
                          className={`flashcard-dialog-line ${
                            lineIdx === 0 ? 'flashcard-dialog-line--question' : 'flashcard-dialog-line--answer'
                          }`}
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  ) : (
                    card.ru_meaning || '—'
                  )}
                </div>
              </div>
            )}
          </div>

          <div
            className="flashcard-corner-fold pointer-events-none absolute bottom-[clamp(12px,1.8vw,18px)] right-[clamp(16px,1.8vw,22px)] z-10"
            aria-hidden="true"
          />

        </div>

        {/* Controls: below card, centered by the card wrapper */}
        <div className="flashcard-controls-wrap relative h-[clamp(31px,7.2vw,56px)] min-w-0">
          <div className="flashcard-cat-inline pointer-events-none absolute z-[20] select-none">
            <Image
              src="/images/deda-cat_2.png"
              alt="Deda cat"
              width={160}
              height={107}
              priority
              className="flashcard-cat drop-shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
              style={{ filter: 'saturate(0.9) brightness(1)' }}
            />
          </div>

          <div className="flashcard-controls-compact absolute left-1/2 top-1/2 inline-flex h-[clamp(31px,7.2vw,56px)] -translate-x-1/2 -translate-y-1/2 items-center gap-[clamp(22px,6vw,40px)]">
            <button
              onClick={() => {
                setShuffled(s => {
                  const next = !s;
                  setOrder(next ? shuffleArr(order) : visible.map((_, i) => i));
                  return next;
                });
              }}
              className={`flashcard-shuffle-btn ${shuffleControl}`}
              title="Перемешать"
              aria-pressed={shuffled}
            >
              <span className="relative inline-flex h-full w-full items-center justify-center">
                <span>⇄</span>
              </span>
            </button>

            <button
              onClick={() => setAuto(a => !a)}
              className={`flashcard-play-btn ${playControl}`}
              title="Автопрокрутка"
              aria-pressed={auto}
            >
              {auto ? (
                <span className="inline-flex h-[0.54em] items-center gap-[4px]" aria-hidden="true">
                  <span className="block h-full w-[4px] rounded-full bg-current" />
                  <span className="block h-full w-[4px] rounded-full bg-current" />
                </span>
              ) : (
                <span
                  className="flashcard-play-triangle inline-block translate-x-[1px]"
                  aria-hidden="true"
                />
              )}
            </button>

            <div className="relative flex items-center justify-center" ref={speedMenuRef}>
              <button
                type="button"
                onClick={() => setSpeedMenuOpen(v => !v)}
                className="flashcard-speed-btn h-[clamp(24px,5.9vw,44px)] min-w-0 rounded-full border-0 bg-transparent px-[clamp(1px,0.4vw,2px)] text-[clamp(11px,2.5vw,13px)] leading-none font-normal text-current outline-none transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] focus:outline-none"
                aria-label="Скорость автопрокрутки"
                title={`Скорость: ${currentSpeedLabel}`}
                aria-haspopup="menu"
                aria-expanded={speedMenuOpen}
              >
                {currentSpeedLabel}
              </button>
              {speedMenuOpen && (
                <div className="absolute right-0 top-full mt-1 z-30 flex flex-col items-end gap-1 py-0.5">
                  {speedOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setAutoSpeedMs(option.value);
                        setSpeedMenuOpen(false);
                      }}
                      title={`Установить скорость ${option.label}`}
                      className={`flashcard-speed-option min-w-0 px-1 py-0.5 text-right text-[11px] leading-none transition-all duration-150 active:scale-[0.99] ${
                        autoSpeedMs === option.value
                          ? 'font-medium text-current'
                          : 'text-current'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
