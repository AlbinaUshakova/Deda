// components/FeedbackPanel.tsx
'use client';

import { useState } from 'react';

export default function FeedbackPanel({
    onClose,
    onBack,
}: {
    onClose: () => void;
    onBack?: () => void;
}) {
    const [message, setMessage] = useState('');
    const [contact, setContact] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);
    const canSend = message.trim().length >= 5 && !sending;

    const handleSend = async () => {
        const trimmedMessage = message.trim();
        const trimmedContact = contact.trim();

        if (!trimmedMessage) {
            setError('Напишите хотя бы пару слов :)');
            return;
        }
        if (trimmedMessage.length < 5) {
            setError('Сообщение слишком короткое');
            return;
        }

        setError(null);
        setSending(true);

        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: trimmedMessage,
                    contact: trimmedContact || null,
                }),
            });

            if (!res.ok) {
                if (res.status === 429) {
                    setError('Слишком часто. Попробуйте через минуту.');
                } else if (res.status === 503) {
                    setError('Почта не настроена. Напишите позже.');
                } else if (res.status === 400) {
                    setError('Проверьте сообщение и контакт.');
                } else {
                    setError('Не получилось отправить. Попробуйте ещё раз позже.');
                }
                setSending(false);
                return;
            }

            setSuccess(true);
            setSending(false);
            setMessage('');
            setContact('');

            // чуть подождём и закроем модалку
            setTimeout(() => {
                onClose();
            }, 800);
        } catch (e) {
            console.error('feedback insert exception', e);
            setError('Что-то пошло не так. Попробуйте ещё раз.');
            setSending(false);
        }
    };

    return (
        <div className="menu-floating-anchor">
            <div className="menu-panel-shell menu-panel-size animate-modal-in overflow-y-auto rounded-2xl border border-[var(--menu-border)] bg-[var(--menu-bg)] p-[clamp(8px,1.5vw,10px)] space-y-2 text-[clamp(11px,1.8vw,12px)] text-[var(--menu-text)] shadow-[var(--menu-shadow)]">
                <div className="relative flex h-10 items-center justify-center border-b border-[var(--menu-divider)] px-1 pb-1.5">
                    {onBack && (
                        <button
                            aria-label="Назад в меню"
                            className="absolute left-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-xl text-[var(--menu-text-muted)] opacity-85 transition hover:bg-transparent hover:text-[var(--menu-text)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--menu-focus)] focus-visible:outline-offset-2"
                            onClick={onBack}
                            disabled={sending}
                        >
                            <svg viewBox="0 0 20 20" className="mx-auto h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M12.5 4.5L7 10l5.5 5.5" />
                            </svg>
                        </button>
                    )}
                    <div className="px-10 text-center text-[clamp(12px,2.2vw,14px)] font-semibold text-[var(--menu-text)]">Обратная связь</div>
                    <button
                        aria-label="Закрыть"
                        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-xl text-[var(--menu-text-muted)] opacity-85 transition hover:bg-transparent hover:text-[var(--menu-text)] focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--menu-focus)] focus-visible:outline-offset-2"
                        onClick={onClose}
                        disabled={sending}
                    >
                        ✕
                    </button>
                </div>

                <p className="pt-0.5 text-[clamp(10px,1.65vw,11px)] text-[var(--menu-text-muted)] leading-relaxed mb-1">
                    Поделитесь, что можно улучшить 🤍
                </p>

                <div className="space-y-1 mt-1.5">
                    <textarea
                        className="w-full rounded-lg bg-[var(--menu-segment-bg)] border border-[var(--menu-segment-border)] px-2 py-1 text-[clamp(10px,1.65vw,11px)] text-[var(--menu-text)] outline-none focus:border-[var(--menu-segment-active)] focus:ring-1 focus:ring-[var(--menu-focus)] resize-none min-h-[96px]"
                        value={message}
                        onChange={e => {
                            setMessage(e.target.value);
                            setError(null);
                            setSuccess(false);
                        }}
                        placeholder="Опишите проблему или идею…"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[clamp(10px,1.65vw,11px)] text-[var(--menu-text-muted)]">
                        Контакт (необязательно)
                    </label>
                    <input
                        className="w-full rounded-lg bg-[var(--menu-segment-bg)] border border-[var(--menu-segment-border)] px-2 py-1 text-[clamp(10px,1.65vw,11px)] text-[var(--menu-text)] outline-none focus:border-[var(--menu-segment-active)] focus:ring-1 focus:ring-[var(--menu-focus)]"
                        value={contact}
                        onChange={e => {
                            setContact(e.target.value);
                            setError(null);
                            setSuccess(false);
                        }}
                        placeholder="Telegram или email"
                    />
                </div>

                {error && (
                    <div className="text-[clamp(10px,1.65vw,11px)] text-red-500">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="text-[clamp(10px,1.65vw,11px)] text-emerald-500 animate-settings-bump">
                        Спасибо! Сообщение отправлено 💌
                    </div>
                )}

                <div className="pt-2">
                    <button
                        className="w-full px-3 py-1.5 text-[clamp(10px,1.7vw,12px)] rounded-lg bg-[var(--menu-segment-active)] text-white font-semibold hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-3 focus-visible:outline-[var(--menu-focus)] focus-visible:outline-offset-2"
                        onClick={handleSend}
                        disabled={!canSend}
                    >
                        {sending ? 'Отправляю…' : 'Отправить'}
                    </button>
                </div>
            </div>
        </div>
    );
}
