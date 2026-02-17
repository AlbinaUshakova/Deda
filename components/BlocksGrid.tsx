// src/components/BlocksGrid.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const BOARD_SIZE = 8;
const PREVIEW_SCALE = 0.6;
const BOARD_PIXEL_SIZE = 'min(76vh, clamp(240px, calc(100vw - 300px), 700px))';

type CellColor = string | null;
type ShapeCell = { r: number; c: number };

type Difficulty = 'easy' | 'medium' | 'hard';

type Shape = { id: string; cells: ShapeCell[]; difficulty: Difficulty };
type Piece = { id: string; shape: Shape; color: string };

type HoverPos = { row: number; col: number } | null;
type DragState = { piece: Piece; pointerX: number; pointerY: number } | null;

type BlocksGridProps = {
  roundId: number;
  onRoundFinished: () => void;
  onRestartRequested: () => void;
  onGameOver: () => void;
  initialBestScore?: number;
  onBestScoreChange?: (best: number) => void;
  topActions?: React.ReactNode;
};

type ClearedCell = {
  r: number;
  c: number;
  color1: string;
  color2: string;
};

const SHAPES: Shape[] = [
  {
    id: 'line4',
    difficulty: 'easy',
    cells: [
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 0, c: 2 },
      { r: 0, c: 3 },
    ],
  },
  {
    id: 'L3',
    difficulty: 'easy',
    cells: [
      { r: 0, c: 0 },
      { r: 1, c: 0 },
      { r: 1, c: 1 },
    ],
  },
  {
    id: 'square3',
    difficulty: 'medium',
    cells: [
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 0, c: 2 },
      { r: 1, c: 0 },
      { r: 1, c: 1 },
      { r: 1, c: 2 },
      { r: 2, c: 0 },
      { r: 2, c: 1 },
      { r: 2, c: 2 },
    ],
  },
  {
    id: 'bigL',
    difficulty: 'hard',
    cells: [
      { r: 0, c: 0 },
      { r: 1, c: 0 },
      { r: 2, c: 0 },
      { r: 2, c: 1 },
    ],
  },
  {
    id: 'line3',
    difficulty: 'easy',
    cells: [
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 0, c: 2 },
    ],
  },
  {
    id: 'square2',
    difficulty: 'easy',
    cells: [
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 1, c: 0 },
      { r: 1, c: 1 },
    ],
  },
  {
    id: 'plus5',
    difficulty: 'medium',
    cells: [
      { r: 0, c: 1 },
      { r: 1, c: 0 },
      { r: 1, c: 1 },
      { r: 1, c: 2 },
      { r: 2, c: 1 },
    ],
  },
  {
    id: 'U5',
    difficulty: 'hard',
    cells: [
      { r: 0, c: 0 },
      { r: 0, c: 2 },
      { r: 1, c: 0 },
      { r: 1, c: 1 },
      { r: 1, c: 2 },
    ],
  },
  {
    id: 'T4',
    difficulty: 'medium',
    cells: [
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 0, c: 2 },
      { r: 1, c: 1 },
    ],
  },
  {
    id: 'zigzag4',
    difficulty: 'medium',
    cells: [
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      { r: 1, c: 1 },
      { r: 1, c: 2 },
    ],
  },
  {
    id: 'single1',
    difficulty: 'easy',
    cells: [{ r: 0, c: 0 }],
  },
  {
    id: 'vline4',
    difficulty: 'medium',
    cells: [
      { r: 0, c: 0 },
      { r: 1, c: 0 },
      { r: 2, c: 0 },
      { r: 3, c: 0 },
    ],
  },
  {
    id: 'vline3',
    difficulty: 'easy',
    cells: [
      { r: 0, c: 0 },
      { r: 1, c: 0 },
      { r: 2, c: 0 },
    ],
  },
];

const COLORS = [
  '#8fa9c3',
  '#9aabc6',
  '#a7a0c5',
  '#b39ac2',
  '#c39ab4',
  '#c69fa2',
  '#c7a88f',
  '#b7af8f',
  '#9fb5a2',
];

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}
function randomColor() {
  return COLORS[randomInt(COLORS.length)];
}

function createEmptyBoard(): CellColor[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array<CellColor>(BOARD_SIZE).fill(null),
  );
}

function getBoardFillRatio(board: CellColor[][]): number {
  const total = BOARD_SIZE * BOARD_SIZE;
  let filled = 0;

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) filled++;
    }
  }

  return filled / total;
}

// можно ли поставить фигуру в конкретное место
function canPlace(
  board: CellColor[][],
  shape: Shape,
  baseRow: number,
  baseCol: number,
): boolean {
  for (const cell of shape.cells) {
    const r = baseRow + cell.r;
    const c = baseCol + cell.c;
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
    if (board[r][c] !== null) return false;
  }
  return true;
}

// физически кладём фигуру на поле
function placePiece(
  board: CellColor[][],
  shape: Shape,
  baseRow: number,
  baseCol: number,
  color: string,
) {
  const next = board.map(row => [...row]);
  for (const cell of shape.cells) {
    const r = baseRow + cell.r;
    const c = baseCol + cell.c;
    next[r][c] = color;
  }
  return next;
}

// фигура вообще где-то помещается на текущем поле?
function shapeHasAnyMove(board: CellColor[][], shape: Shape): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (canPlace(board, shape, r, c)) return true;
    }
  }
  return false;
}

// ровно 3 разных фигуры
// минимум одна точно ставится
// остальные могут быть «заглушками» и усложнять игру
function makeBag(board: CellColor[][]): Piece[] {
  const fill = getBoardFillRatio(board);

  // фигуры, которые вообще можно куда-то поставить
  const availableShapes = SHAPES.filter(shape =>
    shapeHasAnyMove(board, shape),
  );

  // если нет ни одной доступной фигуры — честный game over
  if (availableShapes.length === 0) {
    return [];
  }

  // веса сложностей в зависимости от заполненности
  let weights: { easy: number; medium: number; hard: number };

  if (fill < 0.25) {
    weights = { easy: 6, medium: 3, hard: 1 };
  } else if (fill < 0.6) {
    weights = { easy: 4, medium: 3, hard: 2 };
  } else {
    weights = { easy: 8, medium: 1, hard: 0 };
  }

  const shapeWeight = (shape: Shape) =>
    shape.difficulty === 'easy'
      ? weights.easy
      : shape.difficulty === 'medium'
        ? weights.medium
        : weights.hard;

  // --- 1. выбираем ОДНУ гарантированно ставящуюся фигуру (из availableShapes) ---

  const poolAvailable: Shape[] = [];
  for (const s of availableShapes) {
    const w = Math.max(shapeWeight(s), 1);
    for (let i = 0; i < w; i++) {
      poolAvailable.push(s);
    }
  }

  const guaranteedShape =
    poolAvailable.length > 0
      ? poolAvailable[randomInt(poolAvailable.length)]
      : availableShapes[randomInt(availableShapes.length)];

  const pickedShapes: Shape[] = [guaranteedShape];
  const usedIds = new Set<string>([guaranteedShape.id]);

  // --- 2. добираем до 3 разных фигур из ВСЕХ SHAPES (могут не влезать) ---

  const poolAll: Shape[] = [];
  for (const s of SHAPES) {
    const w = Math.max(shapeWeight(s), 1);
    for (let i = 0; i < w; i++) {
      poolAll.push(s);
    }
  }

  // тасуем общий пул
  for (let i = poolAll.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [poolAll[i], poolAll[j]] = [poolAll[j], poolAll[i]];
  }

  for (const s of poolAll) {
    if (pickedShapes.length >= 3) break;
    if (usedIds.has(s.id)) continue; // только разные фигуры
    pickedShapes.push(s);
    usedIds.add(s.id);
  }

  // safety: если вдруг ещё не набрали 3 (например, мало фигур в SHAPES)
  if (pickedShapes.length < 3) {
    for (const s of SHAPES) {
      if (pickedShapes.length >= 3) break;
      if (usedIds.has(s.id)) continue;
      pickedShapes.push(s);
      usedIds.add(s.id);
    }
  }

  const now = Date.now();
  return pickedShapes.map((shape, idx) => ({
    id: `p_${shape.id}_${now}_${idx}`,
    shape,
    color: randomColor(),
  }));
}

function clearLines(board: CellColor[][]) {
  let cleared = 0;
  let next = board.map(row => [...row]);
  const clearedCellsRaw: { r: number; c: number }[] = [];

  // строки
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (next[r].every(c => c !== null)) {
      cleared++;
      for (let c = 0; c < BOARD_SIZE; c++) {
        clearedCellsRaw.push({ r, c });
        next[r][c] = null;
      }
    }
  }

  // столбцы
  for (let c = 0; c < BOARD_SIZE; c++) {
    let full = true;
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (next[r][c] === null) {
        full = false;
        break;
      }
    }
    if (full) {
      cleared++;
      for (let r = 0; r < BOARD_SIZE; r++) {
        clearedCellsRaw.push({ r, c });
        next[r][c] = null;
      }
    }
  }

  return { board: next, cleared, clearedCellsRaw };
}

function hasAnyMove(board: CellColor[][], pieces: Piece[]): boolean {
  for (const piece of pieces) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (canPlace(board, piece.shape, r, c)) return true;
      }
    }
  }
  return false;
}

function findNearestValidPos(
  board: CellColor[][],
  shape: Shape,
  baseRow: number,
  baseCol: number,
  radius: number,
): HoverPos {
  if (canPlace(board, shape, baseRow, baseCol)) {
    return { row: baseRow, col: baseCol };
  }

  let best: HoverPos = null;
  let bestDist = Infinity;

  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const r = baseRow + dr;
      const c = baseCol + dc;
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) continue;
      if (!canPlace(board, shape, r, c)) continue;

      const d = Math.abs(dr) + Math.abs(dc);
      if (d < bestDist) {
        bestDist = d;
        best = { row: r, col: c };
      }
    }
  }
  return best;
}

export default function BlocksGrid({
  roundId,
  onRoundFinished,
  onRestartRequested,
  onGameOver,
  initialBestScore = 0,
  onBestScoreChange,
  topActions,
}: BlocksGridProps) {
  const [board, setBoard] = useState<CellColor[][]>(() => createEmptyBoard());
  const [bag, setBag] = useState<Piece[]>([]);
  const [drag, setDrag] = useState<DragState>(null);
  const [hover, setHover] = useState<HoverPos>(null);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(initialBestScore);
  const [gameOver, setGameOver] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiSeed, setConfettiSeed] = useState(0);
  const [scorePop, setScorePop] = useState(false);

  const [clearedCells, setClearedCells] = useState<ClearedCell[]>([]);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const confettiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scorePopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevScoreRef = useRef(0);
  const [cellSize, setCellSize] = useState(48);

  const [paletteContainer, setPaletteContainer] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    setBestScore(initialBestScore || 0);
  }, [initialBestScore]);

  useEffect(() => {
    const el = document.getElementById('blocks-palette-slot');
    setPaletteContainer(el);
  }, [roundId]);

  useEffect(() => {
    const measure = () => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const size = rect.width / BOARD_SIZE;
      setCellSize(size);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    return () => {
      if (confettiTimeoutRef.current) {
        clearTimeout(confettiTimeoutRef.current);
      }
      if (scorePopTimeoutRef.current) {
        clearTimeout(scorePopTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (score > prevScoreRef.current) {
      setScorePop(true);
      if (scorePopTimeoutRef.current) {
        clearTimeout(scorePopTimeoutRef.current);
      }
      scorePopTimeoutRef.current = setTimeout(() => {
        setScorePop(false);
      }, 220);
    }
    prevScoreRef.current = score;
  }, [score]);

  // новый раунд: подбираем мешок
  useEffect(() => {
    if (roundId <= 0) return;

    const newBag = makeBag(board);
    setBag(newBag);

    if (newBag.length === 0 || !hasAnyMove(board, newBag)) {
      setTimeout(() => {
        setGameOver(true);
        // onGameOver();
      }, 2000);
    } else {
      setGameOver(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId]);

  // drag & drop
  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      setDrag(prev =>
        prev ? { ...prev, pointerX: e.clientX, pointerY: e.clientY } : prev,
      );

      if (!boardRef.current) {
        setHover(null);
        return;
      }

      const piece = drag.piece;
      if (!piece) {
        setHover(null);
        return;
      }

      const rect = boardRef.current.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;

      const maxCol = Math.max(...piece.shape.cells.map(c => c.c)) + 1;
      const maxRow = Math.max(...piece.shape.cells.map(c => c.r)) + 1;

      const baseCol = Math.round(relX / cellSize - maxCol / 2);
      const baseRow = Math.round(relY / cellSize - maxRow / 2);

      const nearest = findNearestValidPos(
        board,
        piece.shape,
        baseRow,
        baseCol,
        2,
      );
      setHover(nearest);
    };

    const onUp = () => {
      setDrag(prev => {
        if (!prev || gameOver) {
          setHover(null);
          return null;
        }
        if (!hover) {
          setHover(null);
          return null;
        }

        const { row, col } = hover;
        const piece = prev.piece;

        if (canPlace(board, piece.shape, row, col)) {
          const placed = placePiece(board, piece.shape, row, col, piece.color);
          const {
            board: clearedBoard,
            cleared,
            clearedCellsRaw,
          } = clearLines(placed);

          const gainedLines = cleared;
          const newScore = score + gainedLines;

          setBoard(clearedBoard);
          setScore(newScore);
          setBestScore(prevBest => {
            const isNewRecord = newScore > prevBest;
            const updated = isNewRecord ? newScore : prevBest;
            if (isNewRecord) {
              setConfettiSeed(s => s + 1);
              setShowConfetti(true);
              if (confettiTimeoutRef.current) {
                clearTimeout(confettiTimeoutRef.current);
              }
              confettiTimeoutRef.current = setTimeout(() => {
                setShowConfetti(false);
              }, 900);
            }
            if (onBestScoreChange) onBestScoreChange(updated);
            return updated;
          });

          if (cleared > 0 && clearedCellsRaw.length) {
            const withColors: ClearedCell[] = clearedCellsRaw.map(cell => ({
              r: cell.r,
              c: cell.c,
              color1: randomColor(),
              color2: randomColor(),
            }));
            setClearedCells(withColors);
            setTimeout(() => setClearedCells([]), 1900);
          }

          setBag(oldBag => {
            const rest = oldBag.filter(p => p.id !== piece.id);
            setHover(null);

            if (rest.length > 0) {
              if (!hasAnyMove(clearedBoard, rest)) {
                setTimeout(() => {
                  setGameOver(true);
                  // onGameOver();
                }, 2000);
                return rest;
              }
              return rest;
            }

            onRoundFinished();
            return rest;
          });
        } else {
          setHover(null);
        }

        return null;
      });
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [
    drag,
    board,
    hover,
    score,
    cellSize,
    gameOver,
    onRoundFinished,
    onGameOver,
    onBestScoreChange,
  ]);

  const dragPiece = drag?.piece ?? null;

  const startDrag = (piece: Piece, e: React.PointerEvent) => {
    if (!bag.find(p => p.id === piece.id) || gameOver) return;
    e.preventDefault();
    setDrag({ piece, pointerX: e.clientX, pointerY: e.clientY });
  };

  const handleRestart = () => {
    setBoard(createEmptyBoard());
    setScore(0);
    setBag([]);
    setGameOver(false);
    setDrag(null);
    setHover(null);
    setClearedCells([]);
    onRestartRequested();
  };

  let ghostWidth = 0;
  let ghostHeight = 0;
  if (dragPiece) {
    const maxCol = Math.max(...dragPiece.shape.cells.map(c => c.c)) + 1;
    const maxRow = Math.max(...dragPiece.shape.cells.map(c => c.r)) + 1;
    ghostWidth = maxCol * cellSize;
    ghostHeight = maxRow * cellSize;
  }

  return (
    <div className="flex justify-center w-full py-2">
      <div className="flex w-full max-w-6xl justify-center">
        <div
          className="flex flex-col items-stretch relative"
          style={{ width: BOARD_PIXEL_SIZE }}
        >
          {topActions && (
            <div className="absolute right-0 -top-[5.5rem] md:-top-24 z-[95] flex items-center gap-2">
              {topActions}
            </div>
          )}

          {/* поле */}
          <div
            ref={boardRef}
            className="relative grid grid-cols-8 gap-[4px] rounded-3xl p-3 bg-transparent"
            style={{ width: '100%', height: BOARD_PIXEL_SIZE }}
          >
            <div
              className={`absolute right-2 -top-4 z-[90] px-1 py-0 text-white/90 transition-all duration-200 ${scorePop ? 'scale-105 drop-shadow-[0_0_8px_rgba(250,204,21,0.45)]' : ''}`}
              style={{ fontSize: `${cellSize * 0.22}px` }}
            >
              <span className="font-semibold">{score} / {bestScore}</span>
            </div>
            {showConfetti && (
              <div className="pointer-events-none absolute inset-0 z-[80] overflow-hidden rounded-3xl">
                {Array.from({ length: 18 }).map((_, i) => (
                  <span
                    key={`${confettiSeed}-${i}`}
                    className="confetti-dot"
                    style={
                      {
                        '--x': `${8 + ((i * 5.1) % 84)}%`,
                        '--d': `${500 + (i % 6) * 80}ms`,
                        '--r': `${(i * 37) % 360}deg`,
                        '--c': ['#34d399', '#f59e0b', '#60a5fa', '#f472b6'][i % 4],
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
            )}
            {board.map((row, r) =>
              row.map((color, c) => {
                const showHover =
                  hover &&
                  dragPiece &&
                  canPlace(board, dragPiece.shape, hover.row, hover.col) &&
                  dragPiece.shape.cells.some(
                    cell =>
                      cell.r + hover.row === r &&
                      cell.c + hover.col === c,
                  );

                const flash = clearedCells.find(
                  cell => cell.r === r && cell.c === c,
                );

                return (
                  <div
                    key={`${r}-${c}`}
                    className="relative overflow-hidden rounded-lg bg-[#111827] transition-all duration-150 hover:-translate-y-[2px] hover:bg-white/[0.04]"
                  >
                    {color && (
                      <div
                        className="w-full h-full"
                        style={{ backgroundColor: color, borderRadius: 8 }}
                      />
                    )}

                    {showHover && (
                      <div className="absolute inset-[3px] rounded-md border border-white/80 pointer-events-none" />
                    )}

                    {flash && (
                      <div
                        className="absolute inset-[2px] rounded-md cell-flash pointer-events-none"
                        style={
                          {
                            '--c1': flash.color1,
                            '--c2': flash.color2,
                          } as React.CSSProperties
                        }
                      />
                    )}
                  </div>
                );
              }),
            )}

            {gameOver && (
              <div className="absolute inset-0 bg-black/70 rounded-3xl flex flex-col items-center justify-center gap-3 text-sm">
                <div className="text-white font-semibold mb-1">
                  Нет ходов
                </div>
                <div className="text-neutral-300 mb-3">
                  Фигуры больше нельзя разместить.
                </div>
                <button
                  onClick={handleRestart}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm"
                >
                  Сыграть снова
                </button>
              </div>
            )}
          </div>

          {/* кот */}
          <img
            src="/images/deda-cat_6.png"
            alt="deda cat"
            draggable={false}
            className="pointer-events-none select-none"
            style={{
              position: 'absolute',
              left: 0,
              top: -cellSize * 1.55,
              width: cellSize * 2.0,
              height: 'auto',
              zIndex: 60,
            }}
          />
        </div>
      </div>

      {/* призрак фигуры */}
      {drag && dragPiece && (
        <div
          className="pointer-events-none fixed z-[1000]"
          style={{
            left: drag.pointerX - ghostWidth / 2,
            top: drag.pointerY - ghostHeight / 2,
          }}
        >
          <PieceSVG piece={dragPiece} cellSize={cellSize} />
        </div>
      )}

      {/* палитра фигур слева */}
      {paletteContainer &&
        createPortal(
          <div className="flex h-full flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-[48px] md:gap-[72px]">
              {bag.map(piece => {
                const widthCells =
                  Math.max(...piece.shape.cells.map(c => c.c)) + 1;
                const heightCells =
                  Math.max(...piece.shape.cells.map(c => c.r)) + 1;
                const isDragging = dragPiece?.id === piece.id;

                const previewCellSize = cellSize * PREVIEW_SCALE;

                return (
                  <div
                    key={piece.id}
                    onPointerDown={e => startDrag(piece, e)}
                    className="cursor-pointer touch-none transition-transform"
                    style={{
                      width: widthCells * previewCellSize,
                      height: heightCells * previewCellSize,
                      opacity: isDragging ? 0.2 : 1,
                    }}
                  >
                    <PieceSVG piece={piece} cellSize={previewCellSize} />
                  </div>
                );
              })}
            </div>
          </div>,
          paletteContainer,
        )}

      <style jsx>{`
        .confetti-dot {
          position: absolute;
          left: var(--x);
          top: 6%;
          width: 8px;
          height: 12px;
          border-radius: 2px;
          background: var(--c);
          transform: rotate(var(--r));
          animation: confetti-fall var(--d) ease-out forwards;
        }
        @keyframes confetti-fall {
          0% {
            opacity: 0;
            transform: translateY(-8px) rotate(var(--r)) scale(0.7);
          }
          10% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(180px) rotate(calc(var(--r) + 220deg)) scale(1);
          }
        }
        @keyframes flashTwice {
          0% {
            opacity: 0;
            transform: scale(1);
            background: var(--c1);
          }
          10% {
            opacity: 1;
            transform: scale(1.05);
          }
          25% {
            opacity: 0;
          }
          50% {
            opacity: 1;
            transform: scale(1.08);
            background: var(--c2);
          }
          75% {
            opacity: 0;
            transform: scale(0.95);
          }
          100% {
            opacity: 0;
            transform: scale(0.9);
          }
        }

        .cell-flash {
          animation: flashTwice 1.8s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}

function PieceSVG({ piece, cellSize }: { piece: Piece; cellSize: number }) {
  const widthCells = Math.max(...piece.shape.cells.map(c => c.c)) + 1;
  const heightCells = Math.max(...piece.shape.cells.map(c => c.r)) + 1;

  return (
    <svg width={widthCells * cellSize} height={heightCells * cellSize}>
      {piece.shape.cells.map((cell, i) => (
        <rect
          key={i}
          x={cell.c * cellSize}
          y={cell.r * cellSize}
          width={cellSize}
          height={cellSize}
          rx={cellSize * 0.25}
          ry={cellSize * 0.25}
          fill={piece.color}
        />
      ))}
    </svg>
  );
}
