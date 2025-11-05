'use client';

import React, { useEffect, useRef, useState } from 'react';

const BOARD_SIZE = 8;
const PREVIEW_SCALE = 0.5; // 50% от размера клетки

type CellColor = string | null;
type ShapeCell = { r: number; c: number };
type Shape = { id: string; cells: ShapeCell[] };
type Piece = { id: string; shape: Shape; color: string };

type HoverPos = { row: number; col: number } | null;
type DragState = { piece: Piece; pointerX: number; pointerY: number } | null;

type BlocksGridProps = {
  roundId: number;
  onRoundFinished: () => void;      // все фигуры этого раунда поставлены
  onRestartRequested: () => void;   // игрок хочет начать заново после "нет ходов"
};

// Набор фигур
const SHAPES: Shape[] = [
  { id: 'line4', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }] },
  { id: 'L3', cells: [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 1, c: 1 }] },
  {
    id: 'square3',
    cells: [
      { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 },
      { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 },
      { r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 },
    ],
  },
  {
    id: 'bigL',
    cells: [
      { r: 0, c: 0 }, { r: 1, c: 0 }, { r: 2, c: 0 },
      { r: 2, c: 1 },
    ],
  },
  { id: 'line3', cells: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }] },
  {
    id: 'square2',
    cells: [
      { r: 0, c: 0 }, { r: 0, c: 1 },
      { r: 1, c: 0 }, { r: 1, c: 1 },
    ],
  },
];

const COLORS = ['#38bdf8', '#f97373', '#4ade80', '#a855f7', '#facc15', '#fb923c'];

function createEmptyBoard(): CellColor[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array<CellColor>(BOARD_SIZE).fill(null),
  );
}

function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function makePiece(idSuffix: number): Piece {
  const shape = SHAPES[randomInt(SHAPES.length)];
  const color = COLORS[randomInt(COLORS.length)];
  return { id: `p_${shape.id}_${idSuffix}_${Date.now()}`, shape, color };
}

function makeBag(): Piece[] {
  return [makePiece(1), makePiece(2), makePiece(3)];
}

function canPlace(board: CellColor[][], shape: Shape, baseRow: number, baseCol: number): boolean {
  for (const cell of shape.cells) {
    const r = baseRow + cell.r;
    const c = baseCol + cell.c;
    if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return false;
    if (board[r][c] !== null) return false;
  }
  return true;
}

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

function clearLines(board: CellColor[][]) {
  let cleared = 0;
  let next = board.map(row => [...row]);

  // строки
  for (let r = 0; r < BOARD_SIZE; r++) {
    if (next[r].every(c => c !== null)) {
      cleared++;
      next[r] = Array<CellColor>(BOARD_SIZE).fill(null);
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
        next[r][c] = null;
      }
    }
  }

  return { board: next, cleared };
}

function hasAnyMove(board: CellColor[][], pieces: Piece[]): boolean {
  for (const piece of pieces) {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (canPlace(board, piece.shape, r, c)) {
          return true;
        }
      }
    }
  }
  return false;
}

// поиск ближайшей валидной позиции вокруг указанной клетки
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
  let bestDist = Number.POSITIVE_INFINITY;

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
}: BlocksGridProps) {
  const [board, setBoard] = useState<CellColor[][]>(() => createEmptyBoard());
  const [bag, setBag] = useState<Piece[]>([]);
  const [drag, setDrag] = useState<DragState>(null);
  const [hover, setHover] = useState<HoverPos>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const [cellSize, setCellSize] = useState(48);
  const [boardHeight, setBoardHeight] = useState(BOARD_SIZE * 48);

  // Размеры поля: квадрат, фиксированный по ширине
  useEffect(() => {
    const measure = () => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const size = rect.width / BOARD_SIZE;
      setCellSize(size);
      setBoardHeight(rect.width); // высота = ширине → квадрат
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Новый раунд → новый набор фигур (логика раундов)
  useEffect(() => {
    if (roundId <= 0) return;
    const newBag = makeBag();
    if (!hasAnyMove(board, newBag)) {
      setBag([]);
      setGameOver(true);
    } else {
      setGameOver(false);
      setBag(newBag);
    }
  }, [roundId]); // ВАЖНО: только roundId, без board — иначе фигуры будут бесконечно появляться

  // Drag & drop с "прилипанием" к ближайшему валидному месту
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

      const currentPiece = drag?.piece;
      if (!currentPiece) {
        setHover(null);
        return;
      }

      const rect = boardRef.current.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;

      const maxCol = Math.max(...currentPiece.shape.cells.map(c => c.c)) + 1;
      const maxRow = Math.max(...currentPiece.shape.cells.map(c => c.r)) + 1;

      const baseColFloat = relX / cellSize - maxCol / 2;
      const baseRowFloat = relY / cellSize - maxRow / 2;

      const baseCol = Math.round(baseColFloat);
      const baseRow = Math.round(baseRowFloat);

      const nearest = findNearestValidPos(board, currentPiece.shape, baseRow, baseCol, 2);
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
          let placed = placePiece(board, piece.shape, row, col, piece.color);
          const { board: clearedBoard, cleared } = clearLines(placed);
          const newScore = score + piece.shape.cells.length + cleared * 10;

          setBoard(clearedBoard);
          setScore(newScore);

          setBag(oldBag => {
            const rest = oldBag.filter(p => p.id !== piece.id);

            if (rest.length > 0) {
              if (!hasAnyMove(clearedBoard, rest)) {
                setGameOver(true);
                setHover(null);
                return [];
              }
            } else {
              // все фигуры этого раунда поставлены
              onRoundFinished();
            }

            setHover(null);
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
  }, [drag, board, cellSize, gameOver, hover, score, onRoundFinished]);

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
    onRestartRequested();
  };

  // Параметры "призрака" (фигура под курсором)
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
      <div className="flex w-full max-w-6xl items-start justify-center gap-20">
        {/* КОЛОНКА ФИГУР: группа по центру слева от поля */}
        <div
          className="flex flex-col items-end pr-8"
          style={{ height: boardHeight }}
        >
          <div className="flex flex-col justify-center items-center gap-12 h-full">
            {bag.map(piece => {
              const widthCells = Math.max(...piece.shape.cells.map(c => c.c)) + 1;
              const heightCells = Math.max(...piece.shape.cells.map(c => c.r)) + 1;
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

          {/* Очки под колонкой фигур */}
          <div className="mt-6 text-xs text-neutral-400 self-center">
            Очки: {score}
          </div>
        </div>

        {/* Поле 8×8 */}
        <div className="flex-1 flex justify-center">
          <div
            ref={boardRef}
            className="relative grid grid-cols-8 gap-[4px] rounded-3xl p-3 shadow-lg w-[min(72vh,560px)] bg-transparent"
          >
            {board.map((row, r) =>
              row.map((color, c) => {
                const showHover =
                  hover &&
                  dragPiece &&
                  canPlace(board, dragPiece.shape, hover.row, hover.col) &&
                  dragPiece.shape.cells.some(
                    cell => cell.r + hover.row === r && cell.c + hover.col === c,
                  );

                return (
                  <div
                    key={`${r}-${c}`}
                    className="relative rounded-lg bg-[#111827] overflow-hidden"
                    style={{ aspectRatio: '1 / 1' }}
                  >
                    {color && (
                      <div
                        className="w-full h-full"
                        style={{ backgroundColor: color, borderRadius: 8 }}
                      />
                    )}

                    {/* Подсветка текущей позиции фигуры */}
                    {showHover && (
                      <div className="absolute inset-[3px] rounded-md border border-white/80 pointer-events-none" />
                    )}
                  </div>
                );
              }),
            )}

            {/* Оверлей "нет ходов" */}
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
        </div>
      </div>

      {/* Призрак фигуры под курсором: полный размер клетки, поверх всего, цветной */}
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
