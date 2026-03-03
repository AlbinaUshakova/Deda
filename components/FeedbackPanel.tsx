// components/FeedbackPanel.tsx
'use client';

import { useState } from 'react';

export default function FeedbackPanel({ onClose }: { onClose: () => void }) {
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
        <div className="fixed right-2 sm:right-4 top-[86px] z-[140]">
            <div className="w-[186px] sm:w-[198px] max-h-[calc(100dvh-116px)] overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5 space-y-2 text-[12px] text-slate-700">
                <div className="flex items-start justify-between">
                    <div className="text-base font-semibold text-slate-800">Обратная связь</div>
                    <button
                        aria-label="Закрыть"
                        className="mr-1 mt-0.5 h-7 w-7 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
                        onClick={onClose}
                        disabled={sending}
                    >
                        ✕
                    </button>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed mb-1">
                    Поделитесь, что можно улучшить 🤍
                </p>

                <div className="space-y-1 mt-1.5">
                    <textarea
                        className="w-full rounded-lg bg-slate-50 border border-slate-300 px-2 py-1 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30 resize-none min-h-[106px]"
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
                    <label className="text-xs text-slate-600">
                        Контакт (необязательно)
                    </label>
                    <input
                        className="w-full rounded-lg bg-slate-50 border border-slate-300 px-2 py-1 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30"
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
                    <div className="text-xs text-red-500">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="text-xs text-emerald-600 animate-settings-bump">
                        Спасибо! Сообщение отправлено 💌
                    </div>
                )}

                <div className="pt-2">
                    <button
                        className="w-full px-3 py-2 text-sm rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
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
