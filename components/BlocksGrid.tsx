// src/components/BlocksGrid.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const BOARD_SIZE = 8;
const PREVIEW_SCALE = 0.78;
const BOARD_PIXEL_SIZE = 'min(64dvh, clamp(180px, 100%, 620px))';
const GRID_GAP_PX = 4;

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
  leftOfCatAction?: React.ReactNode;
  answerState?: 'idle' | 'wrong' | 'correct';
  paletteSlotId?: string;
  palettePlacement?: 'side' | 'bottom';
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

const TYPE_COLORS = [
  'var(--shape-orange)',
  'var(--shape-purple)',
  'var(--shape-blue)',
  'var(--shape-green)',
];

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function randomPaletteColor() {
  return TYPE_COLORS[randomInt(TYPE_COLORS.length)];
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
  const shuffledColors = [...TYPE_COLORS];
  for (let i = shuffledColors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledColors[i], shuffledColors[j]] = [shuffledColors[j], shuffledColors[i]];
  }

  return pickedShapes.map((shape, idx) => ({
    id: `p_${shape.id}_${now}_${idx}`,
    shape,
    // В одной раздаче все 3 фигуры должны иметь разные цвета.
    color: shuffledColors[idx % shuffledColors.length],
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
  leftOfCatAction,
  answerState = 'idle',
  paletteSlotId = 'blocks-palette-slot',
  palettePlacement = 'side',
}: BlocksGridProps) {
  const [board, setBoard] = useState<CellColor[][]>(() => createEmptyBoard());
  const [bag, setBag] = useState<Piece[]>([]);
  const [drag, setDrag] = useState<DragState>(null);
  const [hover, setHover] = useState<HoverPos>(null);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(initialBestScore);
  const [gameOver, setGameOver] = useState(false);
  const [scorePop, setScorePop] = useState(false);
  const [showCatLangHint, setShowCatLangHint] = useState(false);
  const [catReaction, setCatReaction] = useState<{
    emoji: string;
    text?: string;
    bounce?: boolean;
  } | null>(null);
  const [catReactionVisible, setCatReactionVisible] = useState(false);

  const [clearedCells, setClearedCells] = useState<ClearedCell[]>([]);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const scorePopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionFadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reactionClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const prevAnswerStateRef = useRef(answerState);
  const prevGameOverRef = useRef(gameOver);
  const prevScoreRef = useRef(0);
  const [cellSize, setCellSize] = useState(48);

  const [paletteContainer, setPaletteContainer] = useState<HTMLElement | null>(
    null,
  );
  const boardPixelSize =
    palettePlacement === 'bottom'
      ? 'min(54dvh, clamp(160px, 92vw, 480px))'
      : BOARD_PIXEL_SIZE;

  useEffect(() => {
    setBestScore(initialBestScore || 0);
  }, [initialBestScore]);

  useEffect(() => {
    const el = document.getElementById(paletteSlotId);
    setPaletteContainer(el);
  }, [paletteSlotId, roundId]);

  useEffect(() => {
    const measure = () => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      if (!rect.width) return;
      const size = (rect.width - GRID_GAP_PX * (BOARD_SIZE - 1)) / BOARD_SIZE;
      if (Number.isFinite(size) && size > 0) {
        setCellSize(size);
      }
    };

    measure();
    window.addEventListener('resize', measure);

    let ro: ResizeObserver | null = null;
    if (typeof window !== 'undefined' && 'ResizeObserver' in window && boardRef.current) {
      ro = new ResizeObserver(() => measure());
      ro.observe(boardRef.current);
    }

    return () => {
      window.removeEventListener('resize', measure);
      if (ro) ro.disconnect();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (scorePopTimeoutRef.current) {
        clearTimeout(scorePopTimeoutRef.current);
      }
      if (catHintTimeoutRef.current) {
        clearTimeout(catHintTimeoutRef.current);
      }
      if (reactionFadeTimeoutRef.current) {
        clearTimeout(reactionFadeTimeoutRef.current);
      }
      if (reactionClearTimeoutRef.current) {
        clearTimeout(reactionClearTimeoutRef.current);
      }
    };
  }, []);

  const triggerCatReaction = (
    emoji: string,
    text?: string,
    durationMs = 1500,
  ) => {
    if (reactionFadeTimeoutRef.current) {
      clearTimeout(reactionFadeTimeoutRef.current);
    }
    if (reactionClearTimeoutRef.current) {
      clearTimeout(reactionClearTimeoutRef.current);
    }

    setCatReaction({ emoji, text, bounce: emoji === '🎉' });
    setCatReactionVisible(true);

    const fadeDelay = Math.max(700, durationMs - 350);
    reactionFadeTimeoutRef.current = setTimeout(() => {
      setCatReactionVisible(false);
      reactionFadeTimeoutRef.current = null;
    }, fadeDelay);

    reactionClearTimeoutRef.current = setTimeout(() => {
      setCatReaction(null);
      reactionClearTimeoutRef.current = null;
    }, durationMs);
  };

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

  useEffect(() => {
    const prev = prevAnswerStateRef.current;
    if (answerState !== prev) {
      if (answerState === 'correct') triggerCatReaction('😄', undefined, 1400);
      if (answerState === 'wrong') triggerCatReaction('🥺', undefined, 1600);
      prevAnswerStateRef.current = answerState;
    }
  }, [answerState]);

  useEffect(() => {
    if (!prevGameOverRef.current && gameOver) {
      triggerCatReaction('🥺', 'Давай ещё раз?', 1800);
    }
    prevGameOverRef.current = gameOver;
  }, [gameOver]);

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
        const piece = prev.piece;
        if (!boardRef.current) {
          setHover(null);
          return null;
        }

        const rect = boardRef.current.getBoundingClientRect();
        const relX = prev.pointerX - rect.left;
        const relY = prev.pointerY - rect.top;
        const maxCol = Math.max(...piece.shape.cells.map(c => c.c)) + 1;
        const maxRow = Math.max(...piece.shape.cells.map(c => c.r)) + 1;
        const baseCol = Math.round(relX / cellSize - maxCol / 2);
        const baseRow = Math.round(relY / cellSize - maxRow / 2);
        const finalPos = findNearestValidPos(board, piece.shape, baseRow, baseCol, 2);

        if (!finalPos) {
          setHover(null);
          return null;
        }

        const { row, col } = finalPos;

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
            const updated = newScore > prevBest ? newScore : prevBest;
            if (onBestScoreChange) onBestScoreChange(updated);
            return updated;
          });

          if (cleared > 0 && clearedCellsRaw.length) {
            const withColors: ClearedCell[] = clearedCellsRaw.map(cell => ({
              r: cell.r,
              c: cell.c,
              color1: randomPaletteColor(),
              color2: randomPaletteColor(),
            }));
            setClearedCells(withColors);
            setTimeout(() => setClearedCells([]), 1900);
            triggerCatReaction('🎉', undefined, 1400);
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
  const catMoodClass =
    answerState === 'correct'
      ? 'animate-cat-happy'
      : answerState === 'wrong'
        ? 'animate-cat-sad'
        : '';
  return (
    <div className="flex justify-center w-full py-2">
      <div className="flex w-full max-w-6xl justify-center">
        <div
          className="flex flex-col items-stretch relative"
          style={{ width: boardPixelSize }}
        >
          <div className="mb-[clamp(4px,0.8vh,8px)] px-1 relative z-[70]">
            <div className="blocks-grid-score mt-0 text-center text-[14px] font-semibold tracking-[-0.01em] text-slate-700 opacity-80">
              {score} / {bestScore}
            </div>
          </div>

          {topActions && (
            <div className="absolute right-0 -top-[5.5rem] md:-top-24 z-[95] flex items-center gap-2">
              {topActions}
            </div>
          )}
          {leftOfCatAction && (
            <div className="absolute left-0 -top-[2.35rem] md:-top-[2.75rem] z-[96] translate-x-[245%] origin-top-left scale-150">
              {leftOfCatAction}
            </div>
          )}
          {/* поле */}
          <div
            ref={boardRef}
            className="blocks-grid-board relative grid grid-cols-8 gap-[4px]"
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              minHeight: 240,
              marginTop: 0,
            }}
          >
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
                    className="blocks-grid-cell relative overflow-hidden rounded-lg bg-[var(--grid-cell)] transition-all duration-150 hover:-translate-y-[1px] hover:bg-[var(--grid-cell-hover)]"
                  >
                    {color && (
                      <div
                        className="blocks-grid-filled-cell w-full h-full"
                        style={{ backgroundColor: color, borderRadius: 8 }}
                      />
                    )}

                    {showHover && (
                      <div className="blocks-grid-hover-cell absolute inset-[3px] rounded-md border border-indigo-400/90 pointer-events-none" />
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
              <div className="absolute inset-0 rounded-3xl flex flex-col items-center justify-center gap-3 text-sm pointer-events-none">
                <div className="blocks-grid-gameover-title text-slate-800 font-semibold drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
                  Нет ходов
                </div>
                <div className="blocks-grid-gameover-text text-slate-700 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
                  Фигуры больше нельзя разместить.
                </div>
                <button
                  onClick={handleRestart}
                  className="pointer-events-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
                >
                  Сыграть снова
                </button>
              </div>
            )}

          </div>

          {/* кот + подсказка языка */}
          <button
            type="button"
            onClick={() => {
              setShowCatLangHint(true);
              if (catHintTimeoutRef.current) clearTimeout(catHintTimeoutRef.current);
              catHintTimeoutRef.current = setTimeout(() => setShowCatLangHint(false), 3200);
            }}
            aria-label="Подсказка по выбору языка"
            className="absolute left-0 z-[60] select-none"
            style={{
              top: -cellSize * 1.31,
              left: -cellSize * 0.02,
              width: cellSize * 2.2,
            }}
          >
            {catReaction && (
              <div
                className={`pointer-events-none absolute top-1 right-0 rounded-full bg-white/92 px-1.5 py-0.5 text-[15px] shadow-[0_2px_8px_rgba(15,23,42,0.16)] transition-opacity duration-300 ${
                  catReactionVisible ? 'opacity-100' : 'opacity-0'
                } ${catReaction.bounce ? 'animate-bounce' : ''}
                `}
              >
                {catReaction.emoji}
              </div>
            )}
            {showCatLangHint && (
              <div className="pointer-events-none absolute bottom-[calc(100%-8px)] left-[58%] -translate-x-1/2 w-[250px] z-[80]">
                <div className="relative w-[270px]">
                  <svg viewBox="0 0 320 220" className="w-full h-auto drop-shadow-[0_12px_20px_rgba(0,0,0,0.35)]">
                    <path
                      d="M70 170 C35 170, 20 145, 30 120 C10 105, 18 72, 50 68 C62 40, 98 30, 122 48 C145 20, 190 20, 212 50 C245 40, 275 58, 280 88 C305 98, 312 128, 292 148 C282 162, 262 170, 240 170 C220 186, 96 186, 70 170 Z"
                      fill="rgba(255,255,255,0.85)"
                      stroke="#334155"
                      strokeWidth="3"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center px-10 text-[15px] leading-snug text-center font-semibold tracking-tight text-slate-900">
                    Направление перевода
                    <br />
                    меняется в Настройках
                  </div>
                </div>
              </div>
            )}
            <div className="animate-cat-blink">
              <img
                src="/images/deda-cat_6.png"
                alt="deda cat"
                draggable={false}
                className={`select-none pointer-events-none ${catMoodClass}`}
                style={{
                  width: '100%',
                  height: 'auto',
                }}
              />
            </div>
          </button>
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
          <div
            className={
              palettePlacement === 'bottom'
                ? 'flex w-full flex-row items-center justify-center gap-[clamp(14px,2.2vw,24px)] overflow-hidden py-2'
                : 'flex h-full flex-col items-center justify-center gap-[clamp(16px,2.8vh,30px)] overflow-hidden py-1'
            }
            style={
              palettePlacement === 'bottom'
                ? undefined
                : { transform: `translateY(-${Math.round(cellSize * 0.85)}px)` }
            }
          >
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
                  className="cursor-pointer touch-none"
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
          </div>,
          paletteContainer,
        )}

      <style jsx>{`
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
