// components/ProgressPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import { resetProgress } from '@/lib/supabase';
import { loadProgressMapCached } from '@/lib/supabase';
import { getSettings } from '@/lib/settings';
import { getEpisodesDataCached } from '@/lib/clientContentCache';

export default function ProgressPanel({
  onClose,
  onBack,
}: {
  onClose: () => void;
  onBack?: () => void;
}) {
  const [resetting, setResetting] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      try {
        const [episodesData, progressMap] = await Promise.all([
          getEpisodesDataCached(),
          loadProgressMapCached(),
        ]);
        if (cancelled) return;

        const episodes = episodesData.episodes;
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
    <div className="menu-floating-anchor">
      <div className="animate-modal-in w-[min(244px,calc(100vw-24px))] max-h-[calc(100dvh-108px)] overflow-y-auto rounded-2xl border border-[var(--menu-border)] bg-[var(--menu-bg)] p-2.5 space-y-2 text-[12px] text-[var(--menu-text)] shadow-[var(--menu-shadow)]">
        <div className="relative flex h-10 items-center justify-center border-b border-[var(--menu-divider)] px-1 pb-1.5">
          {onBack && (
            <button
              aria-label="Назад в меню"
              className="absolute left-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-xl text-[var(--menu-text-muted)] transition hover:bg-[var(--menu-hover)] hover:text-[var(--menu-text)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--menu-focus)] focus-visible:outline-offset-2"
              onClick={onBack}
            >
              <svg viewBox="0 0 20 20" className="mx-auto h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12.5 4.5L7 10l5.5 5.5" />
              </svg>
            </button>
          )}
          <div className="px-10 text-center text-[14px] font-semibold text-[var(--menu-text)]">Прогресс</div>
          <button
            aria-label="Закрыть"
            className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-xl text-[var(--menu-text-muted)] transition hover:bg-[var(--menu-hover)] hover:text-[var(--menu-text)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--menu-focus)] focus-visible:outline-offset-2"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-1 pt-0.5">
          <div className="text-[11px] text-[var(--menu-text-muted)]">
            Освоено: {masteredCount} из {totalLessons || 0} уроков
          </div>
          <div className="h-1.5 rounded-full bg-[var(--progress-bg)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--menu-segment-active)] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="mx-auto w-full max-w-full space-y-1.5">
          <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--menu-text-muted)]">
            Статусы уроков
          </div>
          <div className="space-y-0 text-xs leading-[1.15] text-[var(--menu-text)]">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-5 rounded-full bg-[var(--progress-good)]" />
                <span>Освоен</span>
                <span className="text-[11px] leading-none text-[var(--progress-good)]">✓</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-5 rounded-full bg-[var(--progress-low)]" />
              <span>В процессе</span>
              <span className="text-[11px] leading-none text-[var(--menu-text-muted)]">●</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-5 rounded-full bg-[var(--progress-current)]" />
                <span>Рекомендуем</span>
                <span className="home-recommended-paw text-[13px] leading-none">🐾</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-5 rounded-full bg-[var(--text-tertiary)]" />
              <span className="flex items-center gap-1.5">
                <span>Закрыт для изучения</span>
                <span className="text-[11px] leading-none text-[var(--menu-text-muted)]">🔒</span>
              </span>
            </div>
          </div>
        </div>

        <div className="-mx-2.5 border-t border-[var(--menu-divider)]" />
        <div className="space-y-3 pt-0.5">
          <p className="mx-auto max-w-full text-center text-[11px] leading-relaxed text-[var(--menu-text-muted)]">
            <span className="inline-flex items-center gap-1 text-[var(--menu-text)]">⚠ <span>Внимание</span></span>
            <br />
            Все набранные очки будут удалены.
            <br />
            Это действие нельзя отменить.
          </p>

          <button
            className="mx-auto mt-1 w-full max-w-full rounded-xl px-3 py-1.5 text-[11px] leading-none font-semibold border border-red-300/70 text-red-500 hover:bg-red-500/10 active:scale-[0.99] transition disabled:opacity-60 focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--menu-focus)] focus-visible:outline-offset-2"
            onClick={() => setConfirmResetOpen(true)}
            disabled={resetting}
          >
            Сбросить прогресс
          </button>
        </div>

      </div>

      {confirmResetOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 rounded-2xl">
          <div className="w-[220px] origin-top-right scale-[0.7] rounded-xl border border-[var(--menu-border)] bg-[var(--menu-bg)] p-2.5 space-y-2.5 text-[var(--menu-text)]">
            <div className="text-sm font-semibold text-[var(--menu-text)]">Сбросить весь прогресс?</div>
            <div className="text-xs text-[var(--menu-text-muted)]">
              Это удалит набранные очки во всех уроках.
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                className="flex-1 rounded-lg px-3 py-1.5 text-xs border border-[var(--menu-segment-border)] text-[var(--menu-text)] hover:bg-[var(--menu-hover)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--menu-focus)] focus-visible:outline-offset-2"
                onClick={() => setConfirmResetOpen(false)}
                disabled={resetting}
              >
                Отмена
              </button>
              <button
                className="flex-1 rounded-lg px-3 py-1.5 text-xs border border-red-300/70 text-red-500 hover:bg-red-500/10 disabled:opacity-60 focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--menu-focus)] focus-visible:outline-offset-2"
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
