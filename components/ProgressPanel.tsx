// components/ProgressPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import { resetProgress } from '@/lib/supabase';
import { loadProgressMap } from '@/lib/supabase';
import { getSettings } from '@/lib/settings';

export default function ProgressPanel({ onClose }: { onClose: () => void }) {
  const [resetting, setResetting] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      try {
        const [episodesRes, progressMap] = await Promise.all([
          fetch('/api/content/episodes', { cache: 'no-store' }),
          loadProgressMap(),
        ]);
        if (!episodesRes.ok) return;
        const data = await episodesRes.json();
        if (cancelled) return;

        const episodes = Array.isArray(data?.episodes) ? data.episodes : [];
        const normalEpisodes = episodes.filter((ep: any) => /^ep\d+$/i.test(String(ep?.id ?? '')));
        const target = getSettings().lessonTargetScore;
        const mastered = normalEpisodes.filter((ep: any) => (progressMap[ep.id] ?? 0) >= target).length;

        setTotalLessons(normalEpisodes.length);
        setMasteredCount(mastered);
      } catch {
        // ignore summary errors in UI
      }
    };

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  const progressPercent = totalLessons > 0 ? Math.round((masteredCount / totalLessons) * 100) : 0;

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
    <div className="fixed right-2 sm:right-4 top-[86px] z-[140]">
      <div className="animate-modal-in p-2.5 w-[186px] sm:w-[198px] max-h-[calc(100dvh-116px)] overflow-y-auto space-y-2.5 bg-white border border-slate-200 rounded-2xl shadow-xl text-[12px] text-slate-700">
        <div className="flex items-start justify-between mb-2">
          <div className="text-base font-semibold text-slate-800">Прогресс</div>
          <button
            aria-label="Закрыть"
            className="mr-1 mt-0.5 h-7 w-7 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-1">
          <div className="text-[11px] text-slate-600">
            Освоено: {masteredCount} из {totalLessons || 0} уроков
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="mx-auto w-full max-w-full space-y-1.5">
          <div className="text-[10px] uppercase tracking-[0.08em] text-slate-500">
            Статусы уроков
          </div>
          <div className="space-y-0 text-xs leading-[1.15] text-slate-600">
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
              <span>В процессе</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-5 rounded-full bg-yellow-400/95" />
                <span>Рекомендуем</span>
                <span className="text-[11px] leading-none text-yellow-600 drop-shadow-[0_0_4px_rgba(250,204,21,0.55)]">
                  🐾
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-5 rounded-full bg-slate-400/90" />
              <span className="flex items-center gap-1.5">
                <span>Закрыт для изучения</span>
                <span className="text-[11px] leading-none text-slate-500">🔒</span>
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-3 mt-3 space-y-4">
          <p className="mx-auto max-w-full text-center text-[11px] leading-relaxed text-slate-400">
            <span className="inline-flex items-center gap-1 text-slate-500">⚠ <span>Внимание</span></span>
            <br />
            Все набранные очки будут удалены.
            <br />
            Это действие нельзя отменить.
          </p>

          <button
            className="mx-auto mt-1 w-full max-w-full rounded-xl px-3 py-1.5 text-xs leading-none font-semibold border border-red-300 text-red-600 hover:bg-red-50 active:scale-[0.99] transition disabled:opacity-60"
            onClick={() => setConfirmResetOpen(true)}
            disabled={resetting}
          >
            Сбросить прогресс
          </button>
        </div>

      </div>

      {confirmResetOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 rounded-2xl">
          <div className="w-[220px] origin-top-right scale-[0.7] rounded-xl border border-slate-200 bg-white p-2.5 space-y-2.5 text-slate-700">
            <div className="text-sm font-semibold text-slate-800">Сбросить весь прогресс?</div>
            <div className="text-xs text-slate-500">
              Это удалит набранные очки во всех уроках.
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                className="flex-1 rounded-lg px-3 py-1.5 text-xs border border-slate-300 text-slate-600 hover:bg-slate-100"
                onClick={() => setConfirmResetOpen(false)}
                disabled={resetting}
              >
                Отмена
              </button>
              <button
                className="flex-1 rounded-lg px-3 py-1.5 text-xs border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-60"
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
