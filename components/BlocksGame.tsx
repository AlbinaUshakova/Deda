
'use client';
/* DEDA BUILD r4: overlay z-fix + white snap */
import { useEffect, useRef, useState } from 'react';

type Word = { ge: string; ru: string; audio?: string };
type Cell = { r: number; c: number };
type Shape = { id: string; cells: Cell[] };
type Piece = { idStr: string; shape: Shape; colorHex: string };

const BOARD_SIZE = 8;
const UNLOCK_SCORE = 300;

/* ---------------- helpers ---------------- */

function emptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(''));
}
function rand(n: number) { return Math.floor(Math.random() * n); }

// Набор фигур (без «зигзага» и «T»), добавлен квадрат 3×3
const SHAPES: Shape[] = [
  { id: '1',   cells: [{ r: 0, c: 0 }]},
  { id: '2h',  cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }]},
  { id: '2v',  cells: [{ r: 0, c: 0 }, { r: 1, c: 0 }]},
  { id: '3h',  cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }]},
  { id: '3v',  cells: [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 2, c: 0 }]},
  { id: 'sq2', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }]},
  { id: 'L3',  cells: [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 1, c: 1 }]},
  { id: 'L4',  cells: [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 2, c: 0 }, { r: 2, c: 1 }]},
  { id: '4h',  cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }]},
  { id: '4v',  cells: [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 2, c: 0 }, { r: 3, c: 0 }]},
  { id: '5h',  cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }, { r: 0, c: 4 }]},
  { id: '5v',  cells: [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 2, c: 0 }, { r: 3, c: 0 }, { r: 4, c: 0 }]},
  { id: 'sq3', cells: [
    { r:0, c:0 }, { r:0, c:1 }, { r:0, c:2 },
    { r:1, c:0 }, { r:1, c:1 }, { r:1, c:2 },
    { r:2, c:0 }, { r:2, c:1 }, { r:2, c:2 },
  ]},
];

// мягкая палитра «как в Quizlet»
const PALETTE = ['#6ea8fe','#a78bfa','#60d6b7','#f7b267','#f59eb6','#ffd166'];

function drawPieces(): Piece[] {
  const colors = PALETTE.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  return [0, 1, 2].map(i => ({
    idStr: `p${Date.now()}_${i}`,
    shape: SHAPES[rand(SHAPES.length)],
    colorHex: colors[i % colors.length],
  }));
}

function canPlace(board: string[][], shape: Shape, r: number, c: number) {
  return shape.cells.every(({ r: dr, c: dc }) => {
    const R = r + dr, C = c + dc;
    return R >= 0 && C >= 0 && R < BOARD_SIZE && C < BOARD_SIZE && board[R][C] === '';
  });
}

function place(board: string[][], shape: Shape, r: number, c: number, colorHex: string) {
  const next = board.map(row => row.slice());
  shape.cells.forEach(({ r: dr, c: dc }) => { next[r + dr][c + dc] = colorHex; });

  const clearedRows: number[] = [];
  const clearedCols: number[] = [];

  for (let R = 0; R < BOARD_SIZE; R++) if (next[R].every(v => v !== '')) clearedRows.push(R);
  for (let C = 0; C < BOARD_SIZE; C++) {
    let full = true;
    for (let R = 0; R < BOARD_SIZE; R++) if (next[R][C] === '') { full = false; break; }
    if (full) clearedCols.push(C);
  }

  const lines = clearedRows.length + clearedCols.length;
  clearedRows.forEach(R => { next[R] = Array(BOARD_SIZE).fill(''); });
  clearedCols.forEach(C => { for (let R = 0; R < BOARD_SIZE; R++) next[R][C] = ''; });

  return { next, lines };
}

function anyPlacement(board: string[][], piece: Piece) {
  for (let r = 0; r < BOARD_SIZE; r++)
    for (let c = 0; c < BOARD_SIZE; c++)
      if (canPlace(board, piece.shape, r, c)) return true;
  return false;
}

function nextEpisodeId(current: string): string | null {
  const m = current.match(/^ep(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const next = n + 1;
  if (next > 99) return null;
  return `ep${next}`;
}

function norm(s: string) {
  return s.toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* -------------- рисование фигур -------------- */
type _Cell = { r: number; c: number };

function ShapeSVG({ shape, cell, color }: { shape: { cells: _Cell[] }; cell: number; color: string }) {
  const rows = shape.cells.map(c => c.r);
  const cols = shape.cells.map(c => c.c);
  const minR = Math.min(...rows), maxR = Math.max(...rows);
  const minC = Math.min(...cols), maxC = Math.max(...cols);
  const w = (maxC - minC + 1) * cell;
  const h = (maxR - minR + 1) * cell;
  const rects = shape.cells.map((c, i) => {
    const x = (c.c - minC) * cell;
    const y = (c.r - minR) * cell;
    return <rect key={i} x={x} y={y} width={cell - 2} height={cell - 2} rx={8} ry={8} />;
  });
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <g fill={color}>{rects}</g>
    </svg>
  );
}

function ShapeOutline(
  { shape, cell, color, top, left }:
  { shape: { cells: _Cell[] }; cell: number; color: string; top: number; left: number }
) {
  const rows = shape.cells.map(c => c.r);
  const cols = shape.cells.map(c => c.c);
  const minR = Math.min(...rows), maxR = Math.max(...rows);
  const minC = Math.min(...cols), maxC = Math.max(...cols);
  const rects = shape.cells.map((c, i) => {
    const x = left + (c.c - minC) * cell + 1;
    const y = top  + (c.r - minR) * cell + 1;
    return <rect key={i} x={x} y={y} width={cell - 2} height={cell - 2} rx={8} ry={8} />;
  });
  return (
    <svg className="absolute pointer-events-none" style={{ inset: 0 }}>
      <g fill="none" stroke={color} strokeWidth={3}>{rects}</g>
    </svg>
  );
}

/* -------------- вопрос -------------- */
function buildQuestion(words: Word[]) {
  const i = Math.floor(Math.random() * words.length);
  const correct = words[i];
  const options = new Set<string>([correct.ru]);
  while (options.size < Math.min(4, words.length)) options.add(words[Math.floor(Math.random() * words.length)].ru);
  const arr = Array.from(options);
  for (let j = arr.length - 1; j > 0; j--) { const k = Math.floor(Math.random() * (j + 1)); [arr[j], arr[k]] = [arr[k], arr[j]]; }
  return { prompt: correct.ge, correct: correct.ru, options: arr };
}

/* -------------- компонент -------------- */

export default function BlocksGame({ words, episodeId }: { words: Word[]; episodeId: string }) {
  const [board, setBoard] = useState<string[][]>(emptyBoard());
  const [bag, setBag] = useState<Piece[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [noMovesBanner, setNoMovesBanner] = useState(false);

  const [mustAnswer, setMustAnswer] = useState(true);
  const [question, setQuestion] = useState<{ prompt: string; correct: string; options: string[] } | null>(null);
  const [typed, setTyped] = useState('');
  const [typedWrong, setTypedWrong] = useState(false);

  const [bannerUnlock, setBannerUnlock] = useState(false);
  const [showNextBtn, setShowNextBtn] = useState(false);

  const boardDivRef = useRef<HTMLDivElement | null>(null);
  const [hoverAt, setHoverAt] = useState<{ r: number; c: number } | null>(null);
  const [snapAt, setSnapAt] = useState<{ r: number; c: number } | null>(null);
  const [cellPx, setCellPx] = useState(48);

  const draggingRef = useRef(false);
  const heldRef = useRef<Piece | null>(null);
  const boardRefState = useRef<string[][]>(board);
  useEffect(() => { boardRefState.current = board; }, [board]);

  const [, forceTick] = useState(0);

  useEffect(() => { setQuestion(buildQuestion(words)); }, [words]);

  // размеры клетки
  useEffect(() => {
    const el = boardDivRef.current; if (!el) return;
    const resize = () => {
      const rect = el.getBoundingClientRect();
      const px = Math.floor(rect.width / BOARD_SIZE);
      setCellPx(px);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // поиск ближайшей валидной позиции
  const findNearestValid = (board: string[][], piece: Piece, clientX: number, clientY: number) => {
    const el = boardDivRef.current; if (!el) return null;
    const rect = el.getBoundingClientRect();
    let best: { r: number; c: number } | null = null;
    let bestDist = Infinity;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (!canPlace(board, piece.shape, r, c)) continue;
        const cx = rect.left + (c + 0.5) * (rect.width / BOARD_SIZE);
        const cy = rect.top  + (r + 0.5) * (rect.height / BOARD_SIZE);
        const dx = cx - clientX, dy = cy - clientY;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDist) { bestDist = d2; best = { r, c }; }
      }
    }
    return best;
  };

  // глобальные слушатели
  useEffect(() => {
    const move = (e: PointerEvent) => {
      forceTick(t => t + 1);
      if (!draggingRef.current || !heldRef.current) return;
      const el = boardDivRef.current; if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const cw = rect.width / BOARD_SIZE, ch = rect.height / BOARD_SIZE;
      const c = Math.floor(x / cw), r = Math.floor(y / ch);

      if (r >= 0 && c >= 0 && r < BOARD_SIZE && c < BOARD_SIZE) {
        setHoverAt({ r, c });
        setSnapAt(null);
      } else {
        setHoverAt(null);
        const best = findNearestValid(boardRefState.current, heldRef.current, e.clientX, e.clientY);
        setSnapAt(best);
      }
    };

    const up = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      const h = heldRef.current;

      const target = (() => {
        if (!h) return null;
        if (hoverAt && canPlace(boardRefState.current, h.shape, hoverAt.r, hoverAt.c)) return hoverAt;
        if (snapAt && canPlace(boardRefState.current, h.shape, snapAt.r, snapAt.c)) return snapAt;
        return null;
      })();

      if (h && target) {
        setBoard(prev => {
          const { next, lines } = place(prev, h.shape, target.r, target.c, h.colorHex);
          setScore(s => s + 10 + lines * 50);
          setBag(prevBag => {
            const rest = prevBag.filter(x => x.idStr !== h.idStr);
            if (rest.length === 0) {
              setMustAnswer(true);
              setQuestion(buildQuestion(words));
              setTyped('');
            }
            return rest;
          });
          heldRef.current = null;
          return next;
        });
      }

      setHoverAt(null);
      setSnapAt(null);
    };

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', up, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move as any);
      window.removeEventListener('pointerup', up as any);
      window.removeEventListener('pointercancel', up as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverAt, snapAt, words]);

  // выдаём фигуры только после правильного ответа
  useEffect(() => {
    if (!mustAnswer && bag.length === 0) setBag(drawPieces());
  }, [mustAnswer, bag.length]);

  // прогресс и баннер
  useEffect(() => {
    if (score >= UNLOCK_SCORE && !bannerUnlock) {
      setBannerUnlock(true);
      setTimeout(() => setBannerUnlock(false), 3000);
    }
    try {
      const raw = localStorage.getItem('deda_progress');
      let arr: any[] = raw ? JSON.parse(raw) : [];
      const idx = arr.findIndex((x: any) => x.episodeId === episodeId);
      if (idx >= 0) { if (score > (arr[idx].best ?? 0)) arr[idx].best = score; arr[idx].updatedAt = Date.now(); }
      else arr.push({ episodeId, best: score, updatedAt: Date.now() });
      localStorage.setItem('deda_progress', JSON.stringify(arr));
      window.dispatchEvent(new CustomEvent('deda:progress-updated'));
    } catch {}
  }, [score, episodeId, bannerUnlock]);

  // гейм-овер
  useEffect(() => {
    if (mustAnswer || gameOver) return;
    if (bag.length === 0) return;
    const any = bag.some(p => anyPlacement(board, p));
    if (!any) { setGameOver(true); setNoMovesBanner(true); }
  }, [board, bag, mustAnswer, gameOver]);

  useEffect(() => {
    if (gameOver) {
      const nextId = nextEpisodeId(episodeId);
      setShowNextBtn(!!nextId && score >= UNLOCK_SCORE);
    } else setShowNextBtn(false);
  }, [gameOver, episodeId, score]);

  /* ----------- DRAG API ----------- */
  const startDrag = (p: Piece, e: React.PointerEvent) => {
    heldRef.current = p;
    draggingRef.current = true;
    setHoverAt(null);
    setSnapAt(null);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    e.preventDefault();
    e.stopPropagation();
  };

  /* ----------- ANSWER ----------- */
  const submitAnswer = () => {
    if (!question) return;
    if (norm(typed) === norm(question.correct)) {
      setMustAnswer(false);
      setTypedWrong(false);
      setTyped('');
    } else {
      setTypedWrong(true);
      setTimeout(() => setTypedWrong(false), 1200);
    }
  };

  /* -------------- UI -------------- */
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 select-none">
      {/* LEFT */}
      <div className="md:col-span-4 space-y-4">
        <div className="card p-6">
          {mustAnswer ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="h2">Задание</div>
              </div>
              {question ? (
                <div>
                  <div className="text-neutral-300 mb-2">Переведи на русский:</div>
                  <div className="text-3xl mb-4">{question.prompt}</div>
                  <div className="flex items-center gap-2">
                    <input
                      value={typed}
                      onChange={e => setTyped(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') submitAnswer(); }}
                      placeholder="впиши перевод на русском"
                      className={`px-3 py-2 rounded-xl bg-[#0f172a] border ${typedWrong ? 'border-red-500' : 'border-[#374151]'} flex-1 text-neutral-200`}
                    />
                    <button className="btn" onClick={submitAnswer}>Ок</button>
                  </div>
                </div>
              ) : (
                <div className="text-neutral-400">Загрузка задания…</div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="h2">Фигуры</div>
                <div className="badge">Очки: {score}</div>
              </div>
              <div className="flex flex-col gap-3">
                {bag.map((p) => {
                  const scale = 0.25;
                  const rows = Math.max(...p.shape.cells.map(c => c.r)) - Math.min(...p.shape.cells.map(c => c.r)) + 1;
                  const cols = Math.max(...p.shape.cells.map(c => c.c)) - Math.min(...p.shape.cells.map(c => c.c)) + 1;
                  const w = Math.round(cols * cellPx * scale);
                  const h = Math.round(rows * cellPx * scale);
                  return (
                    <div
                      key={p.idStr}
                      onPointerDown={(e) => startDrag(p, e)}
                      draggable={false}
                      className="rounded-xl border border-[#374151] bg-[#0b1220] hover:bg-[#0e1726] flex items-center justify-center"
                      style={{ width: w, height: h, touchAction: 'none' as any }}
                    >
                      <ShapeSVG shape={p.shape} cell={Math.max(8, Math.floor(cellPx * scale))} color={p.colorHex} />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <button
            className="btn"
            onClick={() => {
              heldRef.current = null;
              draggingRef.current = false;
              setHoverAt(null);
              setSnapAt(null);
              setBoard(emptyBoard());
              setBag([]);
              setScore(0);
              setGameOver(false);
              setNoMovesBanner(false);
              setMustAnswer(true);
              setTyped('');
              setTypedWrong(false);
              setQuestion(buildQuestion(words));
            }}
          >
            Новая игра
          </button>
          <div className="badge">Очки: {score}</div>
          {showNextBtn && <a href={`/blocks/${nextEpisodeId(episodeId)}`} className="btn">⏭ Следующий эпизод</a>}
        </div>
      </div>

      {/* RIGHT: поле */}
      <div className="md:col-span-8">
        <div className="card p-4">
          <div className="text-sm text-neutral-400 mb-2">Поле 8×8</div>

          {/* контейнер поля */}
          <div
            ref={boardDivRef}
            className="relative grid grid-cols-8 gap-[2px] w-full rounded-2xl"
            style={{ aspectRatio: '1 / 1', minHeight: 320, background: '#0b1220', border: '1px solid #1f2a37', touchAction: 'none', overflow: 'visible' }}
          >
            {/* клетки (z-0) */}
            {[...Array(BOARD_SIZE)].map((_, r) =>
              [...Array(BOARD_SIZE)].map((_, c) => {
                const color = board[r][c];
                const filled = color !== '';
                return (
                  <div
                    key={`r${r}c${c}`}
                    className="relative rounded-lg border z-0"
                    style={{ backgroundColor: filled ? color : '#101826', borderColor: '#1f2a37', transition: 'background-color 120ms ease' }}
                  />
                );
              })
            )}

            {/* ОВЕРЛЕЙ НАД ВСЕМИ КЛЕТКАМИ */}
            <div className="pointer-events-none absolute inset-0 z-[99999]">
              {/* валидная позиция под курсором — рисуем фигуру */}
              {heldRef.current && hoverAt && canPlace(board, heldRef.current.shape, hoverAt.r, hoverAt.c) && (
                <div
                  className="absolute opacity-95"
                  style={{ top: hoverAt.r * cellPx, left: hoverAt.c * cellPx }}
                >
                  <ShapeSVG shape={heldRef.current.shape} cell={cellPx} color={heldRef.current.colorHex} />
                </div>
              )}

              {/* если hover невалиден, но есть ближайшая валидная — белый контур */}
              {heldRef.current && (!hoverAt || !canPlace(board, heldRef.current.shape, hoverAt?.r ?? -1, hoverAt?.c ?? -1)) && snapAt && (
                <ShapeOutline
                  shape={heldRef.current.shape}
                  cell={cellPx}
                  color={'#ffffff'}
                  top={snapAt.r * cellPx}
                  left={snapAt.c * cellPx}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* баннер «Нет ходов» */}
      {noMovesBanner && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
          <div className="card p-6 max-w-sm text-center">
            <div className="h2 mb-2">Нет ходов</div>
            <p className="text-neutral-300 mb-4">Больше нельзя разместить фигуры. Игра окончена.</p>
            <div className="flex justify-center gap-2">
              <button className="btn" onClick={() => setNoMovesBanner(false)}>Ок</button>
              <button
                className="btn"
                onClick={() => {
                  heldRef.current = null;
                  draggingRef.current = false;
                  setHoverAt(null);
                  setSnapAt(null);
                  setBoard(emptyBoard());
                  setBag([]);
                  setScore(0);
                  setGameOver(false);
                  setNoMovesBanner(false);
                  setMustAnswer(true);
                  setTyped('');
                  setTypedWrong(false);
                  setQuestion(buildQuestion(words));
                }}
              >Новая игра</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
