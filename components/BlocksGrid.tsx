'use client';
import React, { useEffect } from 'react';
import { create } from 'zustand';
import { upsertProgress } from '@/lib/supabase';

type Word = { ge: string; ru: string; audio?: string };
type Cell = { id: string; ch: string };

function rng(seed: number) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0); }
const GE_ALPHABET = Array.from('აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ');
function lettersFor(words: Word[]) { const set = new Set<string>(); words.forEach(w => w.ge.split('').forEach(ch => set.add(ch))); return Array.from(set); }

type Store = {
  score: number; streak: number; cleared: number;
  grid: Cell[]; path: number[]; message?: string;
  target: Word; pool: Word[]; seed: number; timeLeft: number; running: boolean;
  start: (seed?: number, wordsInit?: Word[]) => void;
  pickTarget: () => void;
  addToPath: (idx: number) => void;
  submitPath: () => void;
  resetPath: () => void;
  tick: () => void;
};

export const useBlocks = create<Store>((set, get) => ({
  score: 0, streak: 0, cleared: 0,
  grid: [], path: [], message: undefined,
  target: { ge: '', ru: '' }, pool: [], seed: 1234,
  timeLeft: 120, running: false,
  start: (seed = 1234, wordsInit = []) => {
    const pool = [...wordsInit];
    const R = rng(seed);
    const epLetters = lettersFor(pool.length ? pool : [{ ge: 'ა', ru: '' }]);
    const bag = epLetters.length ? [...epLetters, ...epLetters, ...epLetters] : ['ა'];
    const cells: Cell[] = Array.from({ length: 64 }, (_, i) => {
      const pick = (R() % 100) < 70 ? bag[R() % bag.length] : GE_ALPHABET[R() % GE_ALPHABET.length];
      return { id: `c${i}`, ch: pick };
    });
    set({ score: 0, streak: 0, cleared: 0, grid: cells, path: [], message: undefined, seed, pool, timeLeft: 120, running: true, target: pool[0] || { ge: '', ru: '' } });
  },
  pickTarget: () => {
    const pool = get().pool;
    if (!pool.length) { set({ target: { ge: '', ru: '' } }); return; }
    const i = Math.floor(Math.random() * pool.length);
    set({ target: pool[i], path: [], message: undefined });
  },
  addToPath: (idx: number) => {
    const { path } = get();
    if (path.includes(idx)) return;
    if (path.length === 0) return set({ path: [idx] });
    const last = path[path.length - 1];
    const r1 = Math.floor(last / 8), c1 = last % 8;
    const r2 = Math.floor(idx / 8), c2 = idx % 8;
    const isAdj = (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
    if (isAdj) set({ path: [...path, idx] });
  },
  submitPath: () => {
    const { path, grid, target, score, streak, cleared, pool } = get();
    if (!target || !target.ge) return;
    const word = path.map(i => grid[i].ch).join('');
    if (word === target.ge) {
      const R = rng(Date.now());
      const epLetters = lettersFor(pool.length ? pool : [{ ge: target.ge, ru: '' }]);
      const bag = epLetters.length ? [...epLetters, ...epLetters, ...epLetters] : ['ა'];
      const newGrid = grid.slice();
      path.forEach(i => {
        const pick = (R() % 100) < 70 ? bag[R() % bag.length] : GE_ALPHABET[R() % GE_ALPHABET.length];
        newGrid[i] = { ...newGrid[i], ch: pick };
      });
      const base = 8, bonus = Math.min(10, 2 * (streak + 1));
      const newScore = score + base + bonus;
      set({ grid: newGrid, path: [], score: newScore, streak: streak + 1, cleared: cleared + 1, message: 'Верно! + очки' });
      try { if (target.audio) { const a = new Audio(target.audio); a.play().catch(()=>{}); } } catch {}
      get().pickTarget();
    } else {
      set({ path: [], streak: 0, message: 'Не совпало. Попробуй другое соединение' });
    }
  },
  resetPath: () => set({ path: [] }),
  tick: () => { const { timeLeft } = get(); if (timeLeft > 0) set({ timeLeft: timeLeft - 1 }); }
}));

export default function BlocksGrid({ episodeId = 'ep1', words, onFinish }: { episodeId?: string; words: Word[]; onFinish: (score: number, cleared: number) => void }) {
  const { grid, path, target, score, streak, cleared, message, timeLeft, running, start, addToPath, submitPath, resetPath, tick } = useBlocks();
  useEffect(() => { start(123456, words || []); }, [start, words]);
  useEffect(() => { if (!running) return; const t = setInterval(() => tick(), 1000); return () => clearInterval(t); }, [running, tick]);
  useEffect(() => { if (timeLeft <= 0) { upsertProgress(episodeId, score); onFinish(score, cleared); } }, [timeLeft, score, cleared, episodeId, onFinish]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg">Цель: <span className="badge">{target?.ru || '…'}</span> → собери <span className="badge">{target?.ge || '…'}</span></div>
        <div className="flex items-center gap-3">
          <div className="badge">Очки: {score}</div>
          <div className="badge">Серия: {streak}</div>
          <div className="badge">Время: {timeLeft}s</div>
        </div>
      </div>
      {(!target || !target.ge) && <div className="text-neutral-400 text-sm">Загрузка слов…</div>}
      <div className="grid grid-cols-8 gap-1 select-none">
        {grid.map((cell, idx) => {
          const active = path.includes(idx);
          return (
            <button key={cell.id} onMouseDown={() => addToPath(idx)} onMouseEnter={(e) => { if (e.buttons === 1) addToPath(idx); }}
              className={`aspect-square rounded-xl border border-neutral-700 flex items-center justify-center text-xl ${active ? 'bg-neutral-700' : 'bg-neutral-900 hover:bg-neutral-800'}`}>
              {cell.ch}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button className="btn" onClick={submitPath}>Проверить</button>
        <button className="btn" onClick={resetPath}>Сбросить</button>
        <button className="btn" onClick={() => { upsertProgress(episodeId, score); onFinish(score, cleared); }}>Завершить сессию</button>
      </div>
      {message && <div className="text-sm text-neutral-400">{message}</div>}
      <p className="text-neutral-500 text-xs">Подсказка: соединяй клетки по соседству (вверх/вниз/влево/вправо), без диагоналей.</p>
    </div>
  );
}
