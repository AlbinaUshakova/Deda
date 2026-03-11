// components/SettingsPanel.tsx
'use client';

import { getSettings, setSettings } from '@/lib/settings';
import { useEffect, useState } from 'react';

export default function SettingsPanel({
    onClose,
    onBack,
}: {
    onClose: () => void;
    onBack?: () => void;
}) {
    const [lessonTargetScoreInput, setLessonTargetScoreInput] = useState('25');
    const [translationDirection, setTranslationDirection] = useState<'ge-ru' | 'ru-ge'>('ge-ru');

    useEffect(() => {
        const s = getSettings();
        const value = String(s.lessonTargetScore);
        setLessonTargetScoreInput(value);
        setTranslationDirection(s.translationDirection);
    }, []);

    const applyAndExit = (afterApply: () => void) => {
        const parsed = Number(lessonTargetScoreInput);
        const safe = Number.isFinite(parsed) ? parsed : 25;
        const next = Math.max(10, Math.min(100, Math.round(safe)));
        setSettings({
            lessonTargetScore: next,
            translationDirection,
        });
        afterApply();
    };

    const handleClose = () => {
        applyAndExit(onClose);
    };

    const handleBack = () => {
        if (!onBack) return;
        applyAndExit(onBack);
    };

    const clampTarget = (value: number) => Math.max(10, Math.min(100, Math.round(value)));
    const parsedTarget = Number(lessonTargetScoreInput);
    const safeTarget = Number.isFinite(parsedTarget) ? parsedTarget : 25;

    return (
        <div className="menu-floating-anchor">
            <div className="animate-modal-in w-[min(244px,calc(100vw-24px))] max-h-[calc(100dvh-108px)] overflow-y-auto rounded-2xl border border-[var(--menu-border)] bg-[var(--menu-bg)] p-2.5 text-[12px] text-[var(--menu-text)] shadow-[var(--menu-shadow)]">
                <div className="relative flex h-10 items-center justify-center border-b border-[var(--menu-divider)] px-1 pb-1.5">
                    {onBack && (
                        <button
                            aria-label="Назад в меню"
                            className="absolute left-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-xl text-[var(--menu-text-muted)] transition hover:bg-[var(--menu-hover)] hover:text-[var(--menu-text)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--menu-focus)] focus-visible:outline-offset-2"
                            onClick={handleBack}
                        >
                            <svg viewBox="0 0 20 20" className="mx-auto h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M12.5 4.5L7 10l5.5 5.5" />
                            </svg>
                        </button>
                    )}
                    <div className="px-10 text-center text-[14px] font-semibold text-[var(--menu-text)]">Настройки игры</div>
                    <button
                        aria-label="Закрыть"
                        className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-xl text-[var(--menu-text-muted)] transition hover:bg-[var(--menu-hover)] hover:text-[var(--menu-text)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--menu-focus)] focus-visible:outline-offset-2"
                        onClick={handleClose}
                    >
                        ✕
                    </button>
                </div>
                <div className="pt-2.5">
                    <div className="text-xs mb-2 text-[var(--menu-text)]">Направление перевода</div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setTranslationDirection('ge-ru');
                            }}
                            aria-pressed={translationDirection === 'ge-ru'}
                            className={`relative rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition-colors ${translationDirection === 'ge-ru'
                                ? 'border-[var(--btn-active-border)] bg-[var(--btn-active-bg)] text-[var(--btn-active-text)] shadow-[var(--btn-active-shadow)]'
                                : 'border-[#3E4B5E] bg-transparent text-[#A8B3C7] hover:bg-white/5 hover:border-[#6C6CFF] hover:text-[var(--menu-text)]'
                                }`}
                        >
                            <div>🇬🇪 → 🇷🇺</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setTranslationDirection('ru-ge');
                            }}
                            aria-pressed={translationDirection === 'ru-ge'}
                            className={`relative rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition-colors ${translationDirection === 'ru-ge'
                                ? 'border-[var(--btn-active-border)] bg-[var(--btn-active-bg)] text-[var(--btn-active-text)] shadow-[var(--btn-active-shadow)]'
                                : 'border-[#3E4B5E] bg-transparent text-[#A8B3C7] hover:bg-white/5 hover:border-[#6C6CFF] hover:text-[var(--menu-text)]'
                                }`}
                        >
                            <div>🇷🇺 → 🇬🇪</div>
                        </button>
                    </div>
                </div>

                <div className="-mx-2.5 mt-2.5 border-t border-[var(--menu-divider)]" />

                <div className="pt-2.5">
                    <div className="grid grid-cols-[auto_auto] items-center gap-x-2 gap-y-1">
                        <div className="text-xs text-[var(--menu-text)]">Цель по очкам</div>
                        <div className="inline-flex items-center rounded-xl border border-[var(--menu-stepper-border)] bg-transparent">
                            <button
                                type="button"
                                className="h-9 w-9 rounded-l-xl border-r border-[var(--menu-stepper-border)] text-sm font-semibold text-[var(--menu-text)] hover:bg-[var(--menu-hover)] active:bg-[var(--menu-active)] active:scale-[0.97] transition"
                                onClick={() => {
                                    setLessonTargetScoreInput(String(clampTarget(safeTarget - 1)));
                                }}
                                aria-label="Уменьшить цель"
                                title="Уменьшить цель"
                            >
                                −
                            </button>
                            <input
                                type="number"
                                min={10}
                                max={100}
                                step={1}
                                value={lessonTargetScoreInput}
                                onChange={e => {
                                    const digits = e.target.value.replace(/\D/g, '');
                                    const noLeadingZero = digits.replace(/^0+/, '');
                                    setLessonTargetScoreInput(noLeadingZero);
                                }}
                                onBlur={() => {
                                    if (!lessonTargetScoreInput) {
                                        setLessonTargetScoreInput('25');
                                        return;
                                    }
                                    setLessonTargetScoreInput(String(clampTarget(Number(lessonTargetScoreInput))));
                                }}
                                className="menu-stepper-input h-9 w-11 bg-transparent text-center text-[12px] leading-none text-[var(--menu-text)] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                                type="button"
                                className="h-9 w-9 rounded-r-xl border-l border-[var(--menu-stepper-border)] text-sm font-semibold text-[var(--menu-text)] hover:bg-[var(--menu-hover)] active:bg-[var(--menu-active)] active:scale-[0.97] transition"
                                onClick={() => {
                                    setLessonTargetScoreInput(String(clampTarget(safeTarget + 1)));
                                }}
                                aria-label="Увеличить цель"
                                title="Увеличить цель"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
