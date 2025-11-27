// components/AuthStatus.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import SettingsPanel from '@/components/SettingsPanel';
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
    const [showFeedback, setShowFeedback] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    if (!supabase) {
        return (
            <div className="flex items-center gap-3 text-sm">
                <Link href="/login" className="text-emerald-400 hover:underline">
                    Log in
                </Link>
                <Link href="/signup" className="text-neutral-300 hover:underline text-xs">
                    Sign up
                </Link>
            </div>
        );
    }

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

            const { data: profile, error } = await supabase
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
                const { data, error } = await supabase.auth.getSession();
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
        } = supabase.auth.onAuthStateChange((_event, session) => {
            refreshUser(session);
        });

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
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
            await supabase.auth.signOut();
        } catch (e) {
            console.error('signOut error', e);
        }
        setUser(null);
        setOpen(false);
        window.location.href = '/login';
    };

    if (loading) return null;

    if (!user) {
        return (
            <div className="flex items-center gap-3 text-sm">
                <Link href="/login" className="text-emerald-400 hover:underline">
                    Log in
                </Link>
                <Link href="/signup" className="text-neutral-300 hover:underline text-xs">
                    Sign up
                </Link>
            </div>
        );
    }

    const label = user.name || user.email || 'User';

    return (
        <>
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setOpen(v => !v)}
                    className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-sm hover:bg-white/5 transition-colors"
                >
                    <span className="truncate max-w-[140px]">{label}</span>
                </button>

                {open && (
                    <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-slate-900 border border-white/10 shadow-xl text-sm z-50">
                        {/* шапка с именем и почтой */}
                        <div className="px-4 py-3 border-b border-white/10">
                            <div className="font-medium truncate">{label}</div>
                            {user.email && (
                                <div className="text-xs text-neutral-400 truncate">
                                    {user.email}
                                </div>
                            )}
                        </div>

                        {/* Настройки */}
                        <button
                            className="w-full text-left px-4 py-2 hover:bg-slate-800 text-neutral-100"
                            onClick={() => {
                                setOpen(false);
                                setShowSettings(true);
                            }}
                        >
                            Настройки
                        </button>

                        {/* Помощь и обратная связь */}
                        <button
                            className="w-full text-left px-4 py-2 hover:bg-slate-800 text-neutral-100"
                            onClick={() => {
                                setOpen(false);
                                setShowFeedback(true);
                            }}
                        >
                            Помощь и обратная связь
                        </button>

                        {/* Скрытый пункт "Админка" — только для твоего аккаунта */}
                        {user.email === 'devochka.name@gmail.com' && (
                            <Link
                                href="/admin/feedback"
                                className="block w-full text-left px-4 py-2 hover:bg-slate-800 text-neutral-100"
                                onClick={() => setOpen(false)}
                            >
                                Админка
                            </Link>
                        )}

                        {/* Выйти */}
                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 hover:bg-slate-800 text-red-300"
                        >
                            Выйти
                        </button>
                    </div>
                )}
            </div>

            {showSettings && (
                <SettingsPanel onClose={() => setShowSettings(false)} />
            )}

            {showFeedback && (
                <FeedbackPanel onClose={() => setShowFeedback(false)} />
            )}
        </>
    );
}
