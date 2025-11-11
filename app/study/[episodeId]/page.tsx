// app/study/[episodeId]/page.tsx
'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { loadEpisode } from '@/lib/content';
import TopBar from '@/components/TopBar';

type Card = {
  type: 'word' | 'phrase';
  ge_text: string;
  ru_meaning: string;
  audio_url?: string;
};

/** Простая транслитерация грузинского в латиницу */
function geToTranslit(text: string): string {
  const map: Record<string, string> = {
    'ა': 'a',
    'ბ': 'b',
    'გ': 'g',
    'დ': 'd',
    'ე': 'e',
    'ვ': 'v',
    'ზ': 'z',
    'თ': 't',
    'ი': 'i',
    'კ': "k'",
    'ლ': 'l',
    'მ': 'm',
    'ნ': 'n',
    'ო': 'o',
    'პ': "p'",
    'ჟ': 'zh',
    'რ': 'r',
    'ს': 's',
    'ტ': "t'",
    'უ': 'u',
    'ფ': 'p',
    'ქ': 'k',
    'ღ': 'gh',
    'ყ': "q'",
    'შ': 'sh',
    'ჩ': 'ch',
    'ც': 'ts',
    'ძ': 'dz',
    'წ': "ts'",
    'ჭ': "ch'",
    'ხ': 'kh',
    'ჯ': 'j',
    'ჰ': 'h',
  };

  return Array.from(text)
    .map(ch => map[ch] ?? ch)
    .join('');
}

export default function StudyPage({ params }: { params: { episodeId: string } }) {
  const { episodeId } = params;

  // data
  const [title, setTitle] = useState('');
  const [cards, setCards] = useState<Card[]>([]);
  const [favSet, setFavSet] = useState<Set<string>>(new Set());

  // ui state
  const [idx, setIdx] = useState(0);
  const [flip, setFlip] = useState(false);
  const [revealCount, setRevealCount] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [showTranslit, setShowTranslit] = useState(false); // показывать ли транскрипцию

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

      const c = ep.cards.filter(
        c => c.type === 'word' || c.type === 'phrase',
      ) as Card[];
      setCards(c);
      setIdx(0);
      setFlip(false);
      setRevealCount(0);
      setAutoplay(false);
      setShowTranslit(false);
    })();
  }, [episodeId]);

  // favorites
  function readFav(): Set<string> {
    try {
      const raw = localStorage.getItem('deda_fav_ge');
      if (!raw) return new Set();
      return new Set(JSON.parse(raw) as string[]);
    } catch {
      return new Set();
    }
  }

  function writeFav(next: Set<string>) {
    localStorage.setItem('deda_fav_ge', JSON.stringify(Array.from(next)));
  }

  const toggleFav = useCallback(
    (ge: string) => {
      setFavSet(prev => {
        const next = new Set(prev);
        if (next.has(ge)) next.delete(ge);
        else next.add(ge);
        writeFav(next);

        if (episodeId === 'favorites') {
          setCards(cs => {
            const filtered = cs.filter(c => next.has(c.ge_text));
            if (idx >= filtered.length) {
              setIdx(Math.max(0, filtered.length - 1));
            }
            return filtered;
          });
        }

        return next;
      });
    },
    [episodeId, idx],
  );

  // nav — ЗАЦИКЛИВАНИЕ
  const goNext = useCallback(() => {
    if (!total) return;
    setIdx(i => (i + 1) % total);      // после последней → на первую
    setFlip(false);
    setRevealCount(0);
    setShowTranslit(false);
  }, [total]);

  const goPrev = useCallback(() => {
    if (!total) return;
    setIdx(i => (i - 1 + total) % total); // с первой → на последнюю
    setFlip(false);
    setRevealCount(0);
    setShowTranslit(false);
  }, [total]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlip(f => !f);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  // autoplay (не зацикливаем, а останавливаемся в конце)
  const autoplayRef = useRef<number | null>(null);
  useEffect(() => {
    if (!autoplay || !total) {
      if (autoplayRef.current !== null) {
        window.clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
      return;
    }

    autoplayRef.current = window.setInterval(() => {
      setIdx(i => {
        if (i < total - 1) return i + 1;
        setAutoplay(false);
        return i;
      });
      setFlip(false);
      setRevealCount(0);
      setShowTranslit(false);
    }, 2500);

    return () => {
      if (autoplayRef.current !== null) {
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
    setShowTranslit(false);
  };

  // HINT: строго по ПЕРВОМУ СЛОВУ, по буквам
  const hintText = useMemo(() => {
    if (!card) return '';
    const t = (card.ru_meaning || '').trim();
    if (!t) return '';

    const firstWord = t.split(/\s+/)[0] || '';
    if (!firstWord) return '';

    const letters = Array.from(firstWord);
    const shown = Math.min(revealCount, letters.length);

    const masked = letters
      .map((ch, idx) =>
        idx < shown
          ? ch
          : (/[A-Za-zА-Яа-яЁёІіЇїЄєҐґ\u0400-\u04FF]/.test(ch) ? '_' : ch),
      )
      .join('');

    return masked;
  }, [card, revealCount]);

  const countText = useMemo(() => {
    if (!total) return '0 / 0';
    return `${idx + 1} / ${total}`;
  }, [idx, total]);

  const isFav = card ? favSet.has(card.ge_text) : false;

  const onBoardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-flip')) return;
    setFlip(f => !f);
  };

  return (
    <main className="min-h-screen flex flex-col bg-[#0a0f1b]">
      <TopBar />

      {/* Header */}
      <div className="px-6 pt-2 pb-4 flex items-center justify-between text-neutral-200">
        <div className="flex items-center gap-2" />
        <div className="text-sm opacity-80">{countText}</div>
        <div className="text-sm opacity-90 truncate">
          {title || episodeId}
        </div>
      </div>

      {/* Board */}
      <div className="px-6 flex justify-center">
        <div
          className="relative rounded-3xl bg-[#2a3344]/50 border border-[#1f2a3a] shadow-inner p-4 md:p-6 overflow-hidden w-full max-w-4xl"
          style={{ minHeight: '54vh' }}
          onClick={onBoardClick}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFlip(f => !f);
            }
          }}
        >
          {/* HINT chip */}
          <button
            className="no-flip inline-flex items-center gap-2 bg-[#0b1220] text-neutral-200 px-3 py-2 rounded-full border border-[#243047] shadow-sm hover:bg-[#0e1726] text-sm"
            onClick={e => {
              e.stopPropagation();
              if (!card) return;
              const firstWordLen =
                (card.ru_meaning || '')
                  .trim()
                  .split(/\s+/)[0]?.length || 0;
              if (!firstWordLen) return;
              setRevealCount(c => Math.min(firstWordLen, c + 1));
            }}
            title="Показать подсказку"
          >
            <span>💡</span>
            {revealCount === 0 ? (
              <span>Показать подсказку</span>
            ) : (
              <span>{hintText}</span>
            )}
          </button>

          {/* правые иконки сверху */}
          <div className="no-flip absolute right-4 top-4 flex items-center gap-3 text-neutral-300">
            {/* звук: только mp3, без TTS */}
            <button
              className="hover:opacity-90"
              title="Произнести"
              onClick={e => {
                e.stopPropagation();
                if (!card) return;
                if (!card.audio_url) {
                  alert('У этого слова пока нет аудио. Когда добавим озвучку, здесь можно будет её проиграть.');
                  return;
                }
                try {
                  const audio = new Audio(card.audio_url);
                  audio.play().catch(() => { });
                } catch { }
              }}
            >
              🔊
            </button>

            {/* кнопка транскрипции */}
            {card && (
              <button
                className={`hover:opacity-90 text-xs px-2 py-1 rounded-full border ${showTranslit
                    ? 'border-emerald-400 text-emerald-300 bg-emerald-900/20'
                    : 'border-slate-500 text-neutral-200 bg-black/20'
                  }`}
                title="Показать транскрипцию"
                onClick={e => {
                  e.stopPropagation();
                  setShowTranslit(s => !s);
                }}
              >
                abc
              </button>
            )}

            {/* избранное */}
            {card && (
              <button
                className="hover:opacity-90 text-lg"
                title={isFav ? 'Убрать из избранного' : 'В избранное'}
                onClick={e => {
                  e.stopPropagation();
                  toggleFav(card.ge_text);
                }}
              >
                {isFav ? '⭐' : '☆'}
              </button>
            )}
          </div>

          {/* центр карточки */}
          <div
            className="grid place-items-center"
            style={{ minHeight: '42vh' }}
          >
            {card ? (
              !flip ? (
                <div className="flex flex-col items-center justify-center text-center">
                  <div
                    className="text-4xl md:text-5xl lg:text-6xl text-neutral-100 select-none"
                    style={{
                      fontFamily:
                        "'Noto Sans Georgian', 'DejaVu Sans', system-ui, sans-serif",
                    }}
                  >
                    {card.ge_text}
                  </div>

                  {/* транскрипция под словом */}
                  {showTranslit && (
                    <div className="mt-4 text-lg md:text-xl text-emerald-300/90 select-none">
                      {geToTranslit(card.ge_text)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-2xl md:text-3xl lg:text-4xl text-neutral-100 select-none max-w-2xl text-center">
                  {card.ru_meaning}
                </div>
              )
            ) : (
              <div className="text-neutral-400">Нет карточек</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar — по ширине карточки */}
      <div className="mt-4 px-6 pb-6 flex justify-center">
        <div className="rounded-3xl bg-[#0b1120] border border-[#1f2435] px-4 py-3 flex items-center w-full max-w-4xl">
          {/* стрелки по центру */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-4">
              <button
                onClick={e => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="w-14 h-14 rounded-full bg-[#253048] border border-[#334155] text-neutral-200 hover:bg-[#2b3753] focus:ring-2 focus:ring-blue-400 text-xl"
                aria-label="Назад"
                disabled={!total}
                title="Назад"
              >
                ←
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  goNext();
                }}
                className="w-14 h-14 rounded-full bg-[#253048] border border-[#334155] text-neutral-200 hover:bg-[#2b3753] focus:ring-2 focus:ring-blue-400 text-xl"
                aria-label="Вперёд"
                disabled={!total}
                title="Вперёд"
              >
                →
              </button>
            </div>
          </div>

          {/* правый угол панели — перемешать и автопролистывание */}
          <div className="flex items-center gap-3">
            <button
              className="w-11 h-11 rounded-full bg-[#1f2937] border border-[#334155] flex items-center justify-center text-lg hover:bg-[#273549]"
              onClick={e => {
                e.stopPropagation();
                shuffle();
              }}
              title="Перемешать"
            >
              🔀
            </button>
            <button
              className="w-11 h-11 rounded-full bg-[#1f2937] border border-[#334155] flex items-center justify-center text-lg hover:bg-[#273549]"
              onClick={e => {
                e.stopPropagation();
                setAutoplay(a => !a);
              }}
              title="Автопролистывание"
            >
              {autoplay ? '⏸' : '▶︎'}
            </button>
          </div>
        </div>
      </div>

      {/* кнопки в правом верхнем углу */}
      <div className="fixed right-4 top-[68px] flex gap-2">
        <Link className="btn" href="/">
          На карту
        </Link>
        {card && (
          <Link className="btn" href={`/play/${episodeId}`}>
            Играть
          </Link>
        )}
      </div>
    </main>
  );
}
