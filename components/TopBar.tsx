'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

type Theme = 'dark' | 'light';

export default function TopBar() {
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');
  const menuRef = useRef<HTMLDivElement>(null);

  // загрузка пользователя и темы
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });

    // начальная тема
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('deda_theme') as Theme | null;
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved);
        applyTheme(saved);
      } else {
        // по умолчанию берём системную
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        const initial: Theme = prefersDark ? 'dark' : 'light';
        setTheme(initial);
        applyTheme(initial);
      }
    }

    const clickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const applyTheme = (t: Theme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('deda-theme-dark', 'deda-theme-light');
    root.classList.add(t === 'dark' ? 'deda-theme-dark' : 'deda-theme-light');
  };

  const toggleTheme = () => {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('deda_theme', next);
      }
      applyTheme(next);
      return next;
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const username =
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'User';

  const avatarLetter = (username || 'U').charAt(0).toUpperCase();

  return (
    <header className="flex items-center justify-between mb-6 px-3">
      <Link href="/" className="text-lg font-semibold">
        Deda
      </Link>

      {/* если НЕ залогинен */}
      {!user && (
        <Link href="/login" className="text-sm hover:text-blue-300">
          Log in
        </Link>
      )}

      {/* если залогинен */}
      {user && (
        <div className="relative" ref={menuRef}>
          <button
            className="flex items-center gap-2 text-sm hover:text-blue-300"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
              {avatarLetter}
            </span>
            <span className="max-w-[140px] truncate">{username}</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 bg-slate-800 border border-white/10 rounded-xl shadow-xl w-52 py-2 z-50">
              {/* блок с именем и почтой */}
              <div className="px-4 pb-2 border-b border-white/10 text-sm">
                <div className="font-medium truncate">{username}</div>
                {user?.email && (
                  <div className="text-xs text-neutral-400 truncate">
                    {user.email}
                  </div>
                )}
              </div>

              {/* настройки */}
              <Link
                href="/settings"
                className="block px-4 py-2 text-sm text-neutral-100 hover:bg-slate-700"
                onClick={() => setMenuOpen(false)}
              >
                Настройки
              </Link>

              {/* выйти */}
              <button
                onClick={logout}
                className="block w-full text-left px-4 py-2 text-sm text-red-300 hover:bg-slate-700"
              >
                Выйти
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
