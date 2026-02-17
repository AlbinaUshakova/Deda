// components/ProgressPanel.tsx
'use client';

import { useState } from 'react';
import { resetProgress } from '@/lib/supabase';

export default function ProgressPanel({ onClose }: { onClose: () => void }) {
  const [resetting, setResetting] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const handleResetProgress = async () => {
    setResetting(true);
    try {
      await resetProgress();
      setConfirmResetOpen(false);
      onClose();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="absolute right-4 top-14 z-50">
      <div className="card animate-modal-in p-4 w-[280px] space-y-4 bg-slate-900 border border-white/10 rounded-2xl shadow-xl">
        <div className="flex items-start justify-between mb-2">
          <div className="text-lg font-semibold">Прогресс</div>
          <button
            aria-label="Закрыть"
            className="mr-1 mt-0.5 h-7 w-7 rounded-md text-white/65 hover:text-white hover:bg-white/10 transition"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="mx-auto w-full max-w-[220px] space-y-1.5">
          <div className="text-[10px] uppercase tracking-[0.08em] text-white/65">
            Статусы уроков
          </div>
          <div className="space-y-0 text-xs leading-[1.15] text-white/75">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-5 rounded-full bg-emerald-400/90" />
                <span>Освоен</span>
                <span className="relative flex h-4 w-4 items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-amber-300/18 blur-[2px]" />
                  <span className="relative text-[11px] text-amber-300">🏆</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-5 rounded-full bg-orange-300/90" />
              <span>Почти</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-5 rounded-full bg-yellow-300/90" />
                <span>Рекомендуем</span>
                <span className="text-[11px] leading-none text-sky-100 drop-shadow-[0_0_4px_rgba(125,211,252,0.65)]">
                  ✨
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-5 rounded-full bg-slate-600/80" />
              <span>Закрыт</span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/25 pt-8 mt-2 space-y-3">
          <p className="mx-auto max-w-[220px] text-center text-xs leading-relaxed text-white/65">
            Все набранные очки будут удалены.
            <br />
            Это действие нельзя отменить.
          </p>

          <button
            className="mx-auto w-full max-w-[220px] rounded-xl px-3 py-1.5 text-xs leading-none font-semibold border border-red-400/30 text-red-200/90 hover:bg-red-500/8 active:scale-[0.99] transition disabled:opacity-60"
            onClick={() => setConfirmResetOpen(true)}
            disabled={resetting}
          >
            Сбросить прогресс
          </button>
        </div>

      </div>

      {confirmResetOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 rounded-2xl">
          <div className="w-[250px] rounded-xl border border-white/15 bg-slate-950 p-3 space-y-3">
            <div className="text-sm font-semibold text-white">Сбросить весь прогресс?</div>
            <div className="text-xs text-white/70">
              Это удалит набранные очки во всех уроках.
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                className="flex-1 rounded-lg px-3 py-1.5 text-xs border border-white/20 text-white/85 hover:bg-white/5"
                onClick={() => setConfirmResetOpen(false)}
                disabled={resetting}
              >
                Отмена
              </button>
              <button
                className="flex-1 rounded-lg px-3 py-1.5 text-xs border border-red-400/45 text-red-200 hover:bg-red-500/10 disabled:opacity-60"
                onClick={handleResetProgress}
                disabled={resetting}
              >
                {resetting ? 'Сброс…' : 'Сбросить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
