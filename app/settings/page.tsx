'use client';
import { getSettings, setSettings } from '@/lib/settings';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [studyLang, setStudyLang] = useState('KA');
  const [nativeLang, setNativeLang] = useState('RU');
  useEffect(() => {
    const s = getSettings();
    setStudyLang(s.studyLang); setNativeLang(s.nativeLang);
  }, []);
  const save = () => setSettings({ studyLang, nativeLang });
  return (
    <main>
      <div className="flex items-center justify-between mb-4">
        <h1 className="h1">Настройки языка</h1>
        <Link className="btn" href="/">На карту</Link>
      </div>
      <div className="card p-4 max-w-md space-y-3">
        <div>
          <div className="text-sm mb-1">Выбираю алфавит для изучения</div>
          <select value={studyLang} onChange={e => setStudyLang(e.target.value)}>
            <option value="KA">Грузинский</option>
            {/* future: KO, AR, JA... */}
          </select>
        </div>
        <div>
          <div className="text-sm mb-1">Мой родной язык</div>
          <select value={nativeLang} onChange={e => setNativeLang(e.target.value)}>
            <option value="RU">Русский</option>
            <option value="EN">English</option>
          </select>
        </div>
        <button className="btn" onClick={save}>Сохранить</button>
      </div>
    </main>
  );
}
