// components/SettingsPanel.tsx
'use client';

import { getSettings, setSettings } from '@/lib/settings';
import { useEffect, useState } from 'react';

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
    const [studyLang, setStudyLang] = useState('KA');
    const [nativeLang, setNativeLang] = useState('RU');

    useEffect(() => {
        const s = getSettings();
        setStudyLang(s.studyLang);
        setNativeLang(s.nativeLang);
    }, []);

    const handleClose = () => {
        setSettings({ studyLang, nativeLang });
        onClose(); // просто закрываем панель
    };

    return (
        <div className="absolute right-4 top-14 z-50">
            <div className="card p-4 w-[300px] space-y-3 bg-slate-900 border border-white/10 rounded-2xl shadow-xl">
                <div className="text-lg font-semibold mb-2">Язык</div>

                <div>
                    <div className="text-sm mb-1">Выбираю алфавит для изучения</div>
                    <select
                        value={studyLang}
                        onChange={e => setStudyLang(e.target.value)}
                    >
                        <option value="KA">Грузинский</option>
                    </select>
                </div>

                <div>
                    <div className="text-sm mb-1">Мой родной язык</div>
                    <select
                        value={nativeLang}
                        onChange={e => setNativeLang(e.target.value)}
                    >
                        <option value="RU">Русский</option>
                        <option value="EN">English</option>
                    </select>
                </div>

                <button
                    className="btn"
                    onClick={handleClose}
                >
                    Закрыть
                </button>
            </div>
        </div>
    );
}
