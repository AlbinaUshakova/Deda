// components/FeedbackPanel.tsx
'use client';

import { useState } from 'react';

export default function FeedbackPanel({ onClose }: { onClose: () => void }) {
    const [message, setMessage] = useState('');
    const [contact, setContact] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);

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
        <div className="absolute right-4 top-14 z-50">
            <div className="card w-[320px] bg-[#1E1F22] border border-white/10 rounded-2xl shadow-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                    <div className="text-lg font-semibold">Обратная связь</div>
                    <button
                        aria-label="Закрыть"
                        className="mr-1 mt-0.5 h-7 w-7 rounded-md text-white/65 hover:text-white hover:bg-white/10 transition"
                        onClick={onClose}
                        disabled={sending}
                    >
                        ✕
                    </button>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed">
                    Напишите, что было непонятно,
                    <br />
                    что сломалось или чего не хватает.
                    <br />
                    Я читаю всё лично 🤍
                </p>

                <div className="space-y-1">
                    <textarea
                        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2 py-1 text-sm outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-300/25 resize-none min-h-[106px]"
                        value={message}
                        onChange={e => {
                            setMessage(e.target.value);
                            setError(null);
                            setSuccess(false);
                        }}
                        placeholder="Введите сообщение"
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-neutral-300">
                        Контакт (необязательно)
                    </label>
                    <input
                        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2 py-1 text-sm outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-300/25"
                        value={contact}
                        onChange={e => {
                            setContact(e.target.value);
                            setError(null);
                            setSuccess(false);
                        }}
                        placeholder="@telegram или email"
                    />
                </div>

                {error && (
                    <div className="text-xs text-red-400">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="text-xs text-emerald-400">
                        Сообщение отправлено 💌
                    </div>
                )}

                <div className="pt-1">
                    <button
                        className="w-full px-3 py-2 text-sm rounded-lg bg-emerald-500/95 text-slate-950 font-semibold hover:bg-emerald-400/95 disabled:opacity-60"
                        onClick={handleSend}
                        disabled={sending}
                    >
                        {sending ? 'Отправляю…' : 'Отправить'}
                    </button>
                </div>
            </div>
        </div>
    );
}
