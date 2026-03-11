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

function detectSituationLabel(card?: Card | null): string | null {
  if (!card) return null;
  const ge = card.ge_text || '';
  const ru = card.ru_meaning || '';

  if (/პაკეტ/i.test(ge) || /пакет/i.test(ru)) return 'Пакет';
  if (/ბარათ|ნაღდ/i.test(ge) || /карт|налич/i.test(ru)) return 'Карта или наличные';
  if (/ჩეკ/i.test(ge) || /чек/i.test(ru)) return 'Чек';
  if (/როგორ ხარ|როგორ ხართ|შენ როგორ ხარ/i.test(ge) || /как дела/i.test(ru)) return 'Как дела?';
  if (/უკაცრავად|ბოდიში/i.test(ge) || /извините|простите|прошу прощения/i.test(ru)) return 'Извините';
  if (/ნახვამდის|მშვიდობით|დროებით/i.test(ge) || /до свидания|пока|всего хорошего/i.test(ru)) return 'До свидания';
  if (/მადლობა|გმადლობ|спасибо|благодар/i.test(ge) || /спасибо|благодар/i.test(ru)) return 'Спасибо';
  if (/გამარჯობა|სალამი|დილა მშვიდობისა|საღამო მშვიდობისა|გაუმარჯოს|გაგიმარჯოს/i.test(ge) || /привет|здравствуй|здравствуйте|доброе утро|добрый вечер|добрый день/i.test(ru)) return 'Приветствие';

  return null;
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
  const situationLabel = detectSituationLabel(card);
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
  const showCardImage = !!cardImageSrc && !!imageKey && !brokenImages[imageKey];

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
    'h-10 w-10 rounded-full border-0 bg-transparent text-current opacity-100 transition-all duration-200 ease-out hover:scale-[1.05] active:scale-[0.97] flex items-center justify-center text-[28px] leading-none';
  const shuffleControl =
    'h-10 w-10 rounded-full border-0 bg-transparent text-current opacity-100 transition-all duration-200 ease-out hover:scale-[1.05] active:scale-[0.97] flex items-center justify-center text-[32px] leading-none';
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
    <div className="relative w-full">
      {/* Верх: счётчик и заголовок */}
      <div className="mb-4 flex w-full flex-col items-center justify-center gap-2">
        <div className="w-full max-w-[860px] px-3 sm:px-4 md:px-0 lg:-translate-x-10 xl:-translate-x-12 2xl:-translate-x-14">
          <div className="flashcard-counter text-center text-xs tracking-wide text-[var(--text-secondary)]">
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
      <div className="relative mx-auto w-full max-w-[860px] px-3 sm:px-4 md:px-0 lg:-translate-x-10 xl:-translate-x-12 2xl:-translate-x-14">
        <div
          className="flashcard-main-card relative z-10 mx-auto rounded-3xl border border-slate-200 bg-white"
          style={{ height: '56vh', minHeight: 360, maxHeight: 720 }}
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
              className="absolute left-3 top-1/2 z-20 -translate-y-1/2 h-12 w-12 rounded-full border-0 bg-transparent text-[var(--text-secondary)] shadow-none transition-all duration-150 ease-out hover:bg-transparent hover:shadow-none hover:scale-[1.04] active:scale-[0.98]"
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
              className="flashcard-next-btn absolute right-3 top-1/2 z-20 -translate-y-1/2 h-12 w-12 rounded-full border-0 bg-transparent text-[var(--text-secondary)] shadow-none transition-all duration-150 ease-out hover:bg-transparent hover:shadow-none hover:scale-[1.04] active:scale-[0.98]"
              title="Вперёд"
              aria-label="Вперёд"
            >
              <svg className="block mx-auto" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {hasCard && (
            <>
              {/* Подсказка */}
              <button
                className={`flashcard-hint-btn flashcard-mini-btn group absolute left-4 top-4 z-10 h-10 px-3 text-xs md:text-sm ${navLikeMiniControl}`}
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
                <span className="text-lg leading-none">💡</span>
                <span className="ml-1">{revealCount === 0 ? 'подсказка' : hintText}</span>
              </button>

              {/* Справа сверху: избранное, транслит */}
              <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                <button
                  className={`flashcard-mini-btn h-10 w-10 text-lg ${navLikeMiniControl}`}
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
                  className={`flashcard-mini-btn flashcard-translit-btn h-10 min-w-10 px-3 text-sm md:text-base ${navLikeMiniControl}`}
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

              {situationLabel && (
                <div className="flashcard-situation-badge pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.01em]">
                  Ситуация: {situationLabel}
                </div>
              )}
            </>
          )}

          {/* Контент */}
          <div className="grid h-full w-full select-none place-items-center px-14 sm:px-16 md:px-20 text-center">
            {!hasCard ? (
              <div className="text-[var(--text-secondary)]">
                {isFavoritesPage
                  ? 'Нет отмеченных карточек'
                  : 'Нет карточек'}
              </div>
            ) : !flipped ? (
              <div key={`front-${idx}`} className="flex flex-col items-center justify-center gap-3">
                <div
                  className="flashcard-ge-text mx-auto max-w-[20ch] whitespace-normal break-words text-[clamp(32px,5.5vw,64px)] leading-tight text-slate-800"
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
              <div key={`back-${idx}`} className="flex flex-col items-center justify:center gap-3">
                {showCardImage && cardImageSrc && (
                  <img
                    src={cardImageSrc}
                    alt={card.ru_meaning || card.ge_text}
                    className="h-[140px] w-[140px] rounded-2xl object-contain border border-slate-200 bg-slate-50 p-2"
                    loading="lazy"
                    onError={() => {
                      if (!imageKey) return;
                      setBrokenImages(prev => ({ ...prev, [imageKey]: true }));
                    }}
                  />
                )}
                <div className="flashcard-ru-text mx-auto max-w-[20ch] whitespace-normal break-words text-[clamp(22px,3.6vw,38px)] leading-tight text-[var(--text-primary)]">
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

          {/* котик внизу слева */}
          <div className="pointer-events-none absolute z-[30] hidden select-none md:block left-[-78px] min-[1512px]:left-[-92px] min-[1920px]:left-[-104px] bottom-[-151px]">
            <Image
              src="/images/deda-cat_2.png"
              alt="Deda cat"
              width={208}
              height={139}
              priority
              className="flashcard-cat drop-shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
              style={{ filter: 'saturate(0.9) brightness(1)' }}
            />
          </div>
        </div>

        {/* Controls: below card, centered by the card wrapper */}
        <div className="mt-1 relative h-12 w-full">
          <div className="absolute left-1/2 top-1/2 grid h-12 w-[220px] -translate-x-1/2 -translate-y-1/2 grid-cols-[1fr_auto_1fr] items-center">
            <div className="flex items-center justify-center">
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
            </div>

            <button
              onClick={() => setAuto(a => !a)}
              className={`flashcard-play-btn ${playControl}`}
              title="Автопрокрутка"
              aria-pressed={auto}
            >
              {auto ? (
                <span className="leading-none">Ⅱ</span>
              ) : (
                <span className="leading-none translate-x-[1px]">▶</span>
              )}
            </button>

            <div className="relative flex items-center justify-center" ref={speedMenuRef}>
              <button
                type="button"
                onClick={() => setSpeedMenuOpen(v => !v)}
                className="flashcard-speed-btn h-10 w-10 rounded-full border-0 bg-transparent text-[12px] leading-none font-semibold text-current outline-none transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] focus:outline-none"
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
                      className={`flashcard-speed-option min-w-0 px-1 py-0.5 text-right text-[12px] leading-none transition-all duration-150 active:scale-[0.99] ${
                        autoSpeedMs === option.value
                          ? 'font-semibold text-current'
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
