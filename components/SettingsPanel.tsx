// components/SettingsPanel.tsx
'use client';

import { getSettings, setSettings } from '@/lib/settings';
import { useEffect, useState } from 'react';

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
    const [lessonTargetScoreInput, setLessonTargetScoreInput] = useState('50');
    const [initialTargetInput, setInitialTargetInput] = useState('50');

    useEffect(() => {
        const s = getSettings();
        const value = String(s.lessonTargetScore);
        setLessonTargetScoreInput(value);
        setInitialTargetInput(value);
    }, []);

    const handleClose = () => {
        const parsed = Number(lessonTargetScoreInput);
        const safe = Number.isFinite(parsed) ? parsed : 50;
        const next = Math.max(10, Math.min(100, Math.round(safe)));
        setSettings({ lessonTargetScore: next });
        onClose(); // просто закрываем панель
    };

    return (
        <div className="absolute right-4 top-14 z-50">
            <div className="card animate-modal-in p-4 w-[280px] space-y-3 bg-slate-900 border border-white/10 rounded-2xl shadow-xl">
                <div className="flex items-start justify-between mb-2">
                    <div className="text-lg font-medium text-white/90">Настройки</div>
                    <button
                        aria-label="Закрыть"
                        className="mr-1 mt-0.5 h-7 w-7 rounded-md text-white/65 hover:text-white hover:bg-white/10 transition"
                        onClick={handleClose}
                    >
                        ✕
                    </button>
                </div>
                <div className="-mx-4 border-t border-white/20" />

                <div className="pt-2">
                    <div className="text-sm mb-3 text-white/80">Цель по очкам за урок</div>
                    <div className="flex items-end gap-2">
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
                                if (!lessonTargetScoreInput) setLessonTargetScoreInput('50');
                            }}
                            className="w-[140px] rounded-lg bg-slate-800 border border-white/10 px-3 py-1.5 text-sm leading-none text-white focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="pb-1 text-sm leading-none text-white/70">очков</span>
                    </div>
                    {lessonTargetScoreInput !== initialTargetInput && (
                        <div className="text-xs text-emerald-300 mt-2">✓ Новая цель применится ко всем урокам</div>
                    )}
                    <button
                        type="button"
                        className="mt-2 text-xs text-white/65 hover:text-sky-200 cursor-pointer transition-colors"
                        onClick={() => setLessonTargetScoreInput('50')}
                    >
                        По умолчанию: 50 ↺
                    </button>
                </div>

            </div>
        </div>
    );
}
