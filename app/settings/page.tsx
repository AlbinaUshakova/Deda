'use client';

import { getSettings, setSettings } from '@/lib/settings';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const [studyLang, setStudyLang] = useState('KA');
  const [nativeLang, setNativeLang] = useState('RU');

  // avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // язык
    const s = getSettings();
    setStudyLang(s.studyLang);
    setNativeLang(s.nativeLang);

    // аватар
    async function loadProfile() {
      if (!supabase) return;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (!error && data) {
        setAvatarUrl(data.avatar_url);
      }
    }

    loadProfile();
  }, []);

  const save = () => {
    setSettings({ studyLang, nativeLang });
  };

  // === загрузка аватара ===
  async function uploadAvatar(e: any) {
    try {
      setError(null);
      setSuccess(null);

      const file: File | null = e.target.files?.[0];
      if (!file) return;

      if (!supabase) {
        setError('Supabase не настроен');
        return;
      }

      setUploading(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setError('Нужно войти в аккаунт');
        setUploading(false);
        return;
      }

      const user = userData.user;
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      const filePath = `${user.id}/${fileName}`;

      // загружаем
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadErr) {
        setError(uploadErr.message);
        setUploading(false);
        return;
      }

      // публичный URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // сохраняем в профиле
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updErr) {
        setError(updErr.message);
        setUploading(false);
        return;
      }

      setAvatarUrl(publicUrl);
      setSuccess('Аватар обновлён!');
    } catch (err: any) {
      setError(err?.message || 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#020617] text-neutral-50">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="h1">Настройки</h1>
          <Link className="btn" href="/">Главная</Link>
        </div>

        {/* === AVATAR === */}
        <div className="card p-4 max-w-md space-y-4">
          <div className="text-lg font-semibold">Аватар</div>

          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                className="h-16 w-16 rounded-full object-cover border border-white/20"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-slate-700 flex items-center justify-center text-xl">
                🙂
              </div>
            )}

            <label className="cursor-pointer bg-white/5 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-sm">
              {uploading ? 'Загрузка…' : 'Выбрать аватар'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={uploadAvatar}
                disabled={uploading}
              />
            </label>
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}
          {success && <div className="text-emerald-400 text-sm">{success}</div>}
        </div>

        {/* === LANG SETTINGS === */}
        <div className="card p-4 max-w-md space-y-3">
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

          <button className="btn" onClick={save}>Сохранить</button>
        </div>

      </div>
    </main>
  );
}
