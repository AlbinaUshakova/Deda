// components/AuthStatus.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import SettingsPanel from '@/components/SettingsPanel';
import ProgressPanel from '@/components/ProgressPanel';
import FeedbackPanel from '@/components/FeedbackPanel';
import { getSettings, setSettings, type Settings } from '@/lib/settings';

export default function AuthStatus() {
    const [open, setOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showProgress, setShowProgress] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [theme, setTheme] = useState<Settings['theme']>('light');
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
    const closeAllProfileLayers = () => {
        setOpen(false);
        setShowSettings(false);
        setShowProgress(false);
        setShowFeedback(false);
    };
    const menuLabel = 'Меню';
    const focusRingClass =
        'focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--menu-focus)] focus-visible:outline-offset-2';
    const menuItemClass =
        `flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[14px] font-medium text-[var(--menu-text)] transition ${focusRingClass} hover:bg-[var(--menu-hover)] active:bg-[var(--menu-active)]`;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                closeMenu();
            }
        };
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeMenu();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, []);

    useEffect(() => {
        const syncTheme = () => setTheme(getSettings().theme);
        syncTheme();
        window.addEventListener('deda:settings-updated', syncTheme as EventListener);
        return () => {
            window.removeEventListener('deda:settings-updated', syncTheme as EventListener);
        };
    }, []);

    useEffect(() => {
        const onToggleAlphabet = () => {
            closeAllProfileLayers();
        };
        const onAlphabetOverlayState = (event: Event) => {
            const custom = event as CustomEvent<{ open?: boolean }>;
            if (custom.detail?.open) {
                closeAllProfileLayers();
            }
        };

        window.addEventListener('deda:toggle-alphabet', onToggleAlphabet as EventListener);
        window.addEventListener('deda:alphabet-overlay-state', onAlphabetOverlayState as EventListener);

        return () => {
            window.removeEventListener('deda:toggle-alphabet', onToggleAlphabet as EventListener);
            window.removeEventListener('deda:alphabet-overlay-state', onAlphabetOverlayState as EventListener);
        };
    }, []);

    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth < 1580) {
                closeAllProfileLayers();
            }
        };
        onResize();
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
        };
    }, []);

    return (
        <>
            <div className="relative max-w-full" ref={menuRef}>
                <button
                    onClick={toggleMenu}
                    aria-label="Открыть меню"
                    className={`header-control-btn header-control-btn--menu inline-flex items-center justify-center ${
                        open ? 'header-control-btn--active' : ''
                    }`}
                >
                    <span className="flex flex-col items-center justify-center gap-[4px]" aria-hidden>
                        <span className="block h-[2px] w-4 rounded-full bg-current" />
                        <span className="block h-[2px] w-4 rounded-full bg-current" />
                        <span className="block h-[2px] w-4 rounded-full bg-current" />
                    </span>
                </button>

                {open && (
                    <div className="animate-modal-in fixed right-2 sm:right-4 top-[86px] z-[230] w-[min(244px,calc(100vw-24px))] max-h-[calc(100dvh-118px)] overflow-y-auto rounded-2xl border border-[var(--menu-border)] bg-[var(--menu-bg)] p-2.5 text-[var(--menu-text)] shadow-[var(--menu-shadow)]">
                        {/* шапка с именем и почтой */}
                        <div className="relative flex h-10 items-center border-b border-[var(--menu-divider)] px-1 pb-1.5">
                            <button
                                type="button"
                                aria-label="Закрыть меню"
                                className={`absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-lg text-[var(--menu-text-muted)] transition hover:bg-[var(--menu-hover)] hover:text-[var(--menu-text)] ${focusRingClass}`}
                                onClick={closeMenu}
                            >
                                ✕
                            </button>
                            <div className="truncate pr-10 text-[14px] font-semibold">{menuLabel}</div>
                        </div>

                        <div className="space-y-1 pt-2.5 pb-1.5">
                            {/* Прогресс */}
                            <button
                                className={menuItemClass}
                                onClick={() => {
                                    closeMenu();
                                    setShowProgress(true);
                                }}
                            >
                                <span aria-hidden>📈</span>
                                <span>Прогресс</span>
                            </button>

                            {/* Настройки игры */}
                            <button
                                className={menuItemClass}
                                onClick={() => {
                                    closeMenu();
                                    setShowSettings(true);
                                }}
                            >
                                <span aria-hidden>⚙️</span>
                                <span>Настройки игры</span>
                            </button>

                            {/* Помощь и обратная связь */}
                            <button
                                className={menuItemClass}
                                onClick={() => {
                                    closeMenu();
                                    setShowFeedback(true);
                                }}
                            >
                                <span aria-hidden>💬</span>
                                <span>Помощь и обратная связь</span>
                            </button>
                        </div>

                        <div className="mt-1 border-t border-[var(--menu-divider)] pt-2.5">
                            <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--menu-text-muted)]">
                                Тема
                            </div>
                            <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--menu-segment-border)] bg-[var(--menu-segment-bg)] p-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSettings({ theme: 'light' });
                                        setTheme('light');
                                    }}
                                    className={`rounded-lg px-2 py-1 text-[12px] font-medium transition ${focusRingClass} ${
                                        theme === 'light'
                                            ? 'bg-[var(--menu-segment-active)] text-white shadow-[var(--menu-segment-active-shadow)]'
                                            : 'bg-transparent text-[var(--menu-segment-idle)] hover:bg-[var(--menu-segment-idle-hover)]'
                                    }`}
                                >
                                    Светлая
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSettings({ theme: 'dark' });
                                        setTheme('dark');
                                    }}
                                    className={`rounded-lg px-2 py-1 text-[12px] font-medium transition ${focusRingClass} ${
                                        theme === 'dark'
                                            ? 'bg-[var(--menu-segment-active)] text-white shadow-[var(--menu-segment-active-shadow)]'
                                            : 'bg-transparent text-[var(--menu-segment-idle)] hover:bg-[var(--menu-segment-idle-hover)]'
                                    }`}
                                >
                                    Тёмная
                                </button>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {showSettings && (
                <SettingsPanel
                    onClose={() => {
                        setShowSettings(false);
                    }}
                    onBack={() => {
                        setShowSettings(false);
                        openMenu();
                    }}
                />
            )}
            {showProgress && (
                <ProgressPanel
                    onClose={() => {
                        setShowProgress(false);
                    }}
                    onBack={() => {
                        setShowProgress(false);
                        openMenu();
                    }}
                />
            )}

            {showFeedback && (
                <FeedbackPanel
                    onClose={() => {
                        setShowFeedback(false);
                    }}
                    onBack={() => {
                        setShowFeedback(false);
                        openMenu();
                    }}
                />
            )}
        </>
    );
}
