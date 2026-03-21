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
    const [transliterationMode, setTransliterationMode] = useState<Settings['transliterationMode']>('ru');
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
        `flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[clamp(10px,1.8vw,13px)] font-medium text-[var(--menu-text)] transition ${focusRingClass} hover:bg-[var(--menu-hover)] active:bg-[var(--menu-active)]`;

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
        const syncSettings = () => {
            const settings = getSettings();
            setTheme(settings.theme);
            setTransliterationMode(settings.transliterationMode);
        };
        syncSettings();
        window.addEventListener('deda:settings-updated', syncSettings as EventListener);
        return () => {
            window.removeEventListener('deda:settings-updated', syncSettings as EventListener);
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
                    <span className="header-burger-lines flex flex-col items-center justify-center gap-[3px]" aria-hidden>
                        <span className="header-burger-line block h-[1.5px] w-[13px] rounded-full bg-current" />
                        <span className="header-burger-line block h-[1.5px] w-[13px] rounded-full bg-current" />
                        <span className="header-burger-line block h-[1.5px] w-[13px] rounded-full bg-current" />
                    </span>
                </button>

                {open && (
                    <div className="menu-floating-anchor menu-panel-shell menu-panel-size animate-modal-in overflow-y-auto rounded-2xl border border-[var(--menu-border)] bg-[var(--menu-bg)] p-[clamp(6px,1.1vw,8px)] text-[var(--menu-text)] shadow-[var(--menu-shadow)]">
                        {/* шапка с именем и почтой */}
                        <div
                            className="relative flex h-7 items-center border-b px-0.5 pb-0"
                            style={{ borderColor: 'color-mix(in srgb, var(--menu-divider) 68%, transparent 32%)' }}
                        >
                            <button
                                type="button"
                                aria-label="Закрыть меню"
                                className={`home-alphabet-close absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 rounded-md text-[11px] transition-colors ${focusRingClass}`}
                                onClick={closeMenu}
                            >
                                ✕
                            </button>
                            <div className="whitespace-nowrap pr-8 text-[clamp(9px,1.55vw,13px)] font-semibold">{menuLabel}</div>
                        </div>

                        <div className="space-y-0.5 pt-2 pb-1">
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
                                <span>Помощь и отзывы</span>
                            </button>
                        </div>

                        <div
                            className="mt-0.5 border-t pt-1"
                            style={{ borderColor: 'color-mix(in srgb, var(--menu-divider) 68%, transparent 32%)' }}
                        >
                            <div className="mb-1 px-1 text-[clamp(9px,1.55vw,11px)] font-semibold uppercase tracking-[0.08em] text-[var(--menu-text-muted)]">
                                Тема
                            </div>
                            <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--menu-segment-border)] bg-[var(--menu-segment-bg)] p-[3px]">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSettings({ theme: 'light' });
                                        setTheme('light');
                                    }}
                                    aria-pressed={theme === 'light'}
                                    className={`rounded-[10px] px-2 py-1 text-[clamp(10px,1.7vw,12px)] font-medium transition ${focusRingClass} ${
                                        theme === 'light'
                                            ? 'text-[var(--btn-active-text)] border shadow-none'
                                            : 'bg-transparent text-[var(--menu-segment-idle)] hover:bg-[var(--menu-segment-idle-hover)]'
                                    }`}
                                    style={
                                        theme === 'light'
                                            ? {
                                                background: 'color-mix(in srgb, var(--btn-active-bg) 72%, white 28%)',
                                                borderColor: 'color-mix(in srgb, var(--btn-active-border) 48%, transparent 52%)',
                                            }
                                            : undefined
                                    }
                                >
                                    Светлая
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSettings({ theme: 'dark' });
                                        setTheme('dark');
                                    }}
                                    aria-pressed={theme === 'dark'}
                                    className={`rounded-[10px] px-2 py-1 text-[clamp(10px,1.7vw,12px)] font-medium transition ${focusRingClass} ${
                                        theme === 'dark'
                                            ? 'text-[var(--btn-active-text)] border shadow-none'
                                            : 'bg-transparent text-[var(--menu-segment-idle)] hover:bg-[var(--menu-segment-idle-hover)]'
                                    }`}
                                    style={
                                        theme === 'dark'
                                            ? {
                                                background: 'color-mix(in srgb, var(--btn-active-bg) 72%, white 28%)',
                                                borderColor: 'color-mix(in srgb, var(--btn-active-border) 48%, transparent 52%)',
                                            }
                                            : undefined
                                    }
                                >
                                    Тёмная
                                </button>
                            </div>
                        </div>

                        <div
                            className="mt-0.5 border-t pt-1"
                            style={{ borderColor: 'color-mix(in srgb, var(--menu-divider) 68%, transparent 32%)' }}
                        >
                            <div className="mb-1 px-1 text-[clamp(9px,1.55vw,11px)] font-semibold uppercase tracking-[0.08em] text-[var(--menu-text-muted)]">
                                Транскрипция
                            </div>
                            <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--menu-segment-border)] bg-[var(--menu-segment-bg)] p-[3px]">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSettings({ transliterationMode: 'ru' });
                                        setTransliterationMode('ru');
                                    }}
                                    aria-pressed={transliterationMode === 'ru'}
                                    className={`rounded-[10px] px-2 py-1 text-[clamp(10px,1.7vw,12px)] font-medium transition ${focusRingClass} ${
                                        transliterationMode === 'ru'
                                            ? 'text-[var(--btn-active-text)] border shadow-none'
                                            : 'bg-transparent text-[var(--menu-segment-idle)] hover:bg-[var(--menu-segment-idle-hover)]'
                                    }`}
                                    style={
                                        transliterationMode === 'ru'
                                            ? {
                                                background: 'color-mix(in srgb, var(--btn-active-bg) 72%, white 28%)',
                                                borderColor: 'color-mix(in srgb, var(--btn-active-border) 48%, transparent 52%)',
                                            }
                                            : undefined
                                    }
                                >
                                    Русский
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSettings({ transliterationMode: 'latin' });
                                        setTransliterationMode('latin');
                                    }}
                                    aria-pressed={transliterationMode === 'latin'}
                                    className={`rounded-[10px] px-2 py-1 text-[clamp(10px,1.7vw,11.5px)] font-medium transition ${focusRingClass} ${
                                        transliterationMode === 'latin'
                                            ? 'text-[var(--btn-active-text)] border shadow-none'
                                            : 'bg-transparent text-[var(--menu-segment-idle)] hover:bg-[var(--menu-segment-idle-hover)]'
                                    }`}
                                    style={
                                        transliterationMode === 'latin'
                                            ? {
                                                background: 'color-mix(in srgb, var(--btn-active-bg) 72%, white 28%)',
                                                borderColor: 'color-mix(in srgb, var(--btn-active-border) 48%, transparent 52%)',
                                            }
                                            : undefined
                                    }
                                >
                                    Английский
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
