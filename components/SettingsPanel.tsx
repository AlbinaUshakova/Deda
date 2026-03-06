// components/SettingsPanel.tsx
'use client';

import { getSettings, setSettings } from '@/lib/settings';
import { useEffect, useRef, useState } from 'react';

export default function SettingsPanel({
    onClose,
    onBack,
}: {
    onClose: () => void;
    onBack?: () => void;
}) {
    const [lessonTargetScoreInput, setLessonTargetScoreInput] = useState('50');
    const [initialTargetInput, setInitialTargetInput] = useState('50');
    const [translationDirection, setTranslationDirection] = useState<'ge-ru' | 'ru-ge'>('ge-ru');
    const [initialDirection, setInitialDirection] = useState<'ge-ru' | 'ru-ge'>('ge-ru');
    const [resetPulse, setResetPulse] = useState(false);
    const [feedback, setFeedback] = useState<{ text: string; emoji: string } | null>(null);
    const [feedbackVisible, setFeedbackVisible] = useState(false);
    const resetPulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const feedbackFadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const feedbackClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const s = getSettings();
        const value = String(s.lessonTargetScore);
        setLessonTargetScoreInput(value);
        setInitialTargetInput(value);
        setTranslationDirection(s.translationDirection);
        setInitialDirection(s.translationDirection);
    }, []);

    useEffect(() => {
        return () => {
            if (resetPulseTimeoutRef.current) clearTimeout(resetPulseTimeoutRef.current);
            if (feedbackFadeTimeoutRef.current) clearTimeout(feedbackFadeTimeoutRef.current);
            if (feedbackClearTimeoutRef.current) clearTimeout(feedbackClearTimeoutRef.current);
        };
    }, []);

    const showFeedback = (emoji: string, text: string, durationMs = 1600) => {
        if (feedbackFadeTimeoutRef.current) clearTimeout(feedbackFadeTimeoutRef.current);
        if (feedbackClearTimeoutRef.current) clearTimeout(feedbackClearTimeoutRef.current);
        setFeedback({ emoji, text });
        setFeedbackVisible(true);

        const fadeDelay = Math.max(700, durationMs - 320);
        feedbackFadeTimeoutRef.current = setTimeout(() => {
            setFeedbackVisible(false);
            feedbackFadeTimeoutRef.current = null;
        }, fadeDelay);
        feedbackClearTimeoutRef.current = setTimeout(() => {
            setFeedback(null);
            feedbackClearTimeoutRef.current = null;
        }, durationMs);
    };

    const applyAndExit = (afterApply: () => void) => {
        const parsed = Number(lessonTargetScoreInput);
        const safe = Number.isFinite(parsed) ? parsed : 50;
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
    const triggerResetPulse = () => {
        setResetPulse(true);
        if (resetPulseTimeoutRef.current) clearTimeout(resetPulseTimeoutRef.current);
        resetPulseTimeoutRef.current = setTimeout(() => setResetPulse(false), 260);
    };
    const handleResetToDefault = () => {
        setLessonTargetScoreInput('50');
        triggerResetPulse();
        showFeedback('↺', 'Сброшено до 50');
    };
    const parsedTarget = Number(lessonTargetScoreInput);
    const safeTarget = Number.isFinite(parsedTarget) ? parsedTarget : 50;

    return (
        <div className="fixed right-2 sm:right-4 top-[86px] z-[230]">
            <div className="animate-modal-in w-[min(244px,calc(100vw-24px))] max-h-[calc(100dvh-118px)] overflow-y-auto rounded-2xl border border-[var(--menu-border)] bg-[var(--menu-bg)] p-2.5 text-[12px] text-[var(--menu-text)] shadow-[var(--menu-shadow)]">
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
                            className={`relative rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition-colors ${translationDirection === 'ge-ru'
                                ? 'border-transparent bg-[linear-gradient(135deg,#6C6CFF,#5B59E8)] text-white shadow-[0_2px_10px_rgba(91,89,232,0.35)]'
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
                            className={`relative rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition-colors ${translationDirection === 'ru-ge'
                                ? 'border-transparent bg-[linear-gradient(135deg,#6C6CFF,#5B59E8)] text-white shadow-[0_2px_10px_rgba(91,89,232,0.35)]'
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
                        <div className={`inline-flex items-center rounded-xl border border-[var(--menu-stepper-border)] bg-transparent ${resetPulse ? 'animate-settings-bump' : ''}`}>
                            <button
                                type="button"
                                className="h-9 w-9 rounded-l-xl border-r border-[var(--menu-stepper-border)] text-sm font-semibold text-[var(--menu-text)] hover:bg-[var(--menu-hover)] active:bg-[var(--menu-active)] active:scale-[0.97] transition"
                                onClick={() => {
                                    setLessonTargetScoreInput(String(clampTarget(safeTarget - 1)));
                                    showFeedback('✅', 'Цель обновлена');
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
                                        setLessonTargetScoreInput('50');
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
                                    showFeedback('✅', 'Цель обновлена');
                                }}
                                aria-label="Увеличить цель"
                                title="Увеличить цель"
                            >
                                +
                            </button>
                        </div>
                        <div />
                        <button
                            type="button"
                            className="justify-self-start inline-flex items-center gap-1 rounded-md bg-transparent px-0 py-0 text-[10px] text-[var(--menu-text-muted)] hover:text-[var(--menu-text)] active:scale-[0.98] transition"
                            onClick={handleResetToDefault}
                        >
                            <span>Сбросить до 50</span>
                            <span className="inline-block -translate-y-[1px] text-[11px] leading-none">⟳</span>
                        </button>
                    </div>
                </div>

                {feedback && (
                    <div
                        className={`rounded-lg bg-[var(--menu-active)] px-2.5 py-1 text-[11px] text-[var(--menu-text)] transition-opacity duration-300 ${feedbackVisible ? 'opacity-100' : 'opacity-0'
                            }`}
                    >
                        <span className="mr-1">{feedback.emoji}</span>
                        <span>{feedback.text}</span>
                    </div>
                )}

            </div>
        </div>
    );
}
