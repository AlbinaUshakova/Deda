// components/AuthStatus.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import SettingsPanel from '@/components/SettingsPanel';
import ProgressPanel from '@/components/ProgressPanel';
import FeedbackPanel from '@/components/FeedbackPanel';

type UserInfo = {
    id: string;
    name: string | null;
    email: string | null;
};

export default function AuthStatus() {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showProgress, setShowProgress] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const emitProfileMenuOpened = () => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent('deda:profile-menu-opened'));
    };
    const openMenu = () => {
        setOpen(true);
        emitProfileMenuOpened();
    };
    const closeMenu = () => setOpen(false);
    const toggleMenu = () => {
        setOpen(prev => {
            const next = !prev;
            if (next) emitProfileMenuOpened();
            return next;
        });
    };

    if (!supabase) {
        return (
            <div className="flex max-w-full items-center justify-end text-sm">
                <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-[1px] hover:bg-slate-50 hover:text-slate-800"
                >
                    Log in
                </Link>
            </div>
        );
    }
    const sb = supabase;

    useEffect(() => {
        let cancelled = false;

        async function refreshUser(session: any) {
            if (cancelled) return;

            const sessionUser = session?.user ?? null;
            if (!sessionUser) {
                setUser(null);
                setLoading(false);
                return;
            }

            const { data: profile, error } = await sb
                .from('profiles')
                .select('display_name')
                .eq('id', sessionUser.id)
                .maybeSingle();

            if (cancelled) return;

            if (error) {
                console.error('load profile error', error);
            }

            const displayName = (profile as any)?.display_name ?? null;

            setUser({
                id: sessionUser.id,
                name: displayName,
                email: sessionUser.email ?? null,
            });
            setLoading(false);
        }

        async function loadSession() {
            try {
                const { data, error } = await sb.auth.getSession();
                if (error) {
                    console.error('getSession error', error);
                    setUser(null);
                    setLoading(false);
                } else {
                    await refreshUser(data.session);
                }
            } catch (e) {
                console.error('getSession exception', e);
                setUser(null);
                setLoading(false);
            }
        }

        loadSession();

        const {
            data: { subscription },
        } = sb.auth.onAuthStateChange((_event, session) => {
            refreshUser(session);
        });

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                closeMenu();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            cancelled = true;
            subscription.unsubscribe();
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        try {
            await sb.auth.signOut();
        } catch (e) {
            console.error('signOut error', e);
        }
        setUser(null);
        closeMenu();
        window.location.href = '/login';
    };

    if (loading) return null;

    if (!user) {
        return (
            <div className="flex max-w-full items-center justify-end text-sm">
                <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-[1px] hover:bg-slate-50 hover:text-slate-800"
                >
                    Log in
                </Link>
            </div>
        );
    }

    const label = user.name || user.email || 'User';

    return (
        <>
            <div className="relative max-w-full" ref={menuRef}>
                <button
                    onClick={toggleMenu}
                    className="flex max-w-full items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-[1px] hover:bg-slate-50"
                >
                    <span className="truncate max-w-[48vw] sm:max-w-[140px]">{label}</span>
                </button>

                {open && (
                    <div className="fixed right-2 sm:right-4 top-[86px] w-[min(82vw,176px)] lg:w-[166px] xl:w-[176px] max-h-[calc(100dvh-110px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl text-[11px] sm:text-xs z-[140] text-slate-700">
                        {/* шапка с именем и почтой */}
                        <div className="relative px-2.5 py-2 border-b border-slate-200">
                            <button
                                type="button"
                                aria-label="Закрыть меню"
                                className="absolute right-2 top-2 h-6 w-6 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                                onClick={closeMenu}
                            >
                                ✕
                            </button>
                            <div className="font-medium truncate">{label}</div>
                            {user.email && (
                                <div className="text-xs text-slate-500 truncate pr-7">
                                    {user.email}
                                </div>
                            )}
                        </div>

                        {/* Прогресс */}
                        <button
                            className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 text-slate-700"
                            onClick={() => {
                                closeMenu();
                                setShowProgress(true);
                            }}
                        >
                            Прогресс
                        </button>

                        {/* Настройки игры */}
                        <button
                            className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 text-slate-700"
                            onClick={() => {
                                closeMenu();
                                setShowSettings(true);
                            }}
                        >
                            Настройки игры
                        </button>

                        {/* Помощь и обратная связь */}
                        <button
                            className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 text-slate-700"
                            onClick={() => {
                                closeMenu();
                                setShowFeedback(true);
                            }}
                        >
                            Помощь и обратная связь
                        </button>

                        {/* Выйти */}
                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-red-50 text-red-600"
                        >
                            Выйти
                        </button>
                    </div>
                )}
            </div>

            {showSettings && (
                <SettingsPanel
                    onClose={() => {
                        setShowSettings(false);
                        openMenu();
                    }}
                />
            )}
            {showProgress && (
                <ProgressPanel
                    onClose={() => {
                        setShowProgress(false);
                        openMenu();
                    }}
                />
            )}

            {showFeedback && (
                <FeedbackPanel
                    onClose={() => {
                        setShowFeedback(false);
                        openMenu();
                    }}
                />
            )}
        </>
    );
}
