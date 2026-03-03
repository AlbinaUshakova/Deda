// components/SettingsPanel.tsx
'use client';

import { getSettings, setSettings } from '@/lib/settings';
import { useEffect, useRef, useState } from 'react';

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
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

    const handleClose = () => {
        const parsed = Number(lessonTargetScoreInput);
        const safe = Number.isFinite(parsed) ? parsed : 50;
        const next = Math.max(10, Math.min(100, Math.round(safe)));
        setSettings({
            lessonTargetScore: next,
            translationDirection,
        });
        onClose(); // просто закрываем панель
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
        <div className="fixed right-2 sm:right-4 top-[86px] z-[140]">
            <div className="animate-modal-in p-2 w-[186px] sm:w-[198px] max-h-[calc(100dvh-116px)] overflow-y-auto space-y-2 bg-white border border-slate-200 rounded-2xl shadow-xl text-[12px] text-slate-700">
                <div className="flex items-start justify-between mb-1">
                    <div className="text-[15px] font-normal text-slate-800">Настройки игры</div>
                    <button
                        aria-label="Закрыть"
                        className="mr-1 mt-0.5 h-7 w-7 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
                        onClick={handleClose}
                    >
                        ✕
                    </button>
                </div>
                <div className="-mx-2.5 border-t border-slate-200" />

                <div className="pt-0.5">
                    <div className="text-xs mb-2 text-slate-700">Направление перевода</div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setTranslationDirection('ge-ru');
                                showFeedback('✅', 'С грузинского на русский');
                            }}
                            className={`relative rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${translationDirection === 'ge-ru'
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-transparent bg-slate-100/85 text-slate-700 hover:bg-slate-200/85'
                                }`}
                        >
                            {translationDirection === 'ge-ru' && (
                                <span className="absolute right-2 top-2 text-[10px] leading-none">✓</span>
                            )}
                            <div>🇬🇪 → 🇷🇺</div>
                            <div className="mt-0.5 text-[10px] font-normal leading-tight">
                                С грузинского на русский
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setTranslationDirection('ru-ge');
                                showFeedback('✅', 'С русского на грузинский');
                            }}
                            className={`relative rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${translationDirection === 'ru-ge'
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-transparent bg-slate-100/85 text-slate-700 hover:bg-slate-200/85'
                                }`}
                        >
                            {translationDirection === 'ru-ge' && (
                                <span className="absolute right-2 top-2 text-[10px] leading-none">✓</span>
                            )}
                            <div>🇷🇺 → 🇬🇪</div>
                            <div className="mt-0.5 text-[10px] font-normal leading-tight">
                                С русского на грузинский
                            </div>
                        </button>
                    </div>
                </div>

                <div className="-mx-2.5 mt-2 border-t border-slate-200" />

                <div className="pt-3">
                    <div className="grid grid-cols-[auto_auto] items-center gap-x-2 gap-y-1">
                        <div className="text-xs text-slate-700">Цель по очкам</div>
                        <div className={`inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ${resetPulse ? 'animate-settings-bump' : ''}`}>
                            <button
                                type="button"
                                className="h-8 w-8 rounded-l-lg border-r border-slate-200 text-base font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 active:bg-indigo-100 active:scale-[0.97] transition"
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
                                className="h-8 w-[52px] bg-transparent text-center text-xs leading-none text-slate-700 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                                type="button"
                                className="h-8 w-8 rounded-r-lg border-l border-slate-200 text-base font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 active:bg-indigo-100 active:scale-[0.97] transition"
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
                            className="justify-self-start inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-transparent px-1.5 py-[2px] text-[9px] text-slate-400 hover:border-slate-300 hover:bg-slate-50/70 hover:text-slate-600 active:scale-[0.98] transition"
                            onClick={handleResetToDefault}
                        >
                            <span>Сбросить до 50</span>
                            <span className="inline-block -translate-y-[1px] text-[11px] leading-none">⟳</span>
                        </button>
                    </div>
                </div>

                {feedback && (
                    <div
                        className={`rounded-lg bg-indigo-50/90 px-2.5 py-1 text-[11px] text-indigo-700 transition-opacity duration-300 ${feedbackVisible ? 'opacity-100' : 'opacity-0'
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
