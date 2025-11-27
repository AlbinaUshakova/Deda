// components/FeedbackPanel.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function FeedbackPanel({ onClose }: { onClose: () => void }) {
    const [message, setMessage] = useState('');
    const [contact, setContact] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSend = async () => {
        if (!message.trim()) {
            setError('Напишите хотя бы пару слов :)');
            return;
        }

        if (!supabase) {
            setError('Supabase не настроен');
            return;
        }

        setError(null);
        setSending(true);

        try {
            // берём текущего пользователя (если есть)
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData?.user?.id ?? null;

            const { error: insertError } = await supabase
                .from('feedback')
                .insert([
                    {
                        user_id: userId,
                        message: message.trim(),
                        contact: contact.trim() || null,
                    },
                ]);

            if (insertError) {
                console.error('feedback insert error', insertError);
                setError('Не получилось отправить. Попробуйте ещё раз позже.');
                setSending(false);
                return;
            }

            setSuccess(true);
            setSending(false);

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
        <div className="absolute right-4 top-32 z-50">
            <div className="card w-[320px] bg-slate-900 border border-white/10 rounded-2xl shadow-xl p-4 space-y-3">
                <div className="text-lg font-semibold">Помощь и обратная связь</div>

                <p className="text-xs text-neutral-400">
                    Напишите, что было непонятно, что сломалось или чего не хватает. Я
                    прочитаю всё лично 🤍
                </p>

                <div className="space-y-1">
                    <label className="text-xs text-neutral-300">
                        Сообщение
                    </label>
                    <textarea
                        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2 py-1 text-sm outline-none focus:border-emerald-400 resize-none min-h-[90px]"
                        value={message}
                        onChange={e => {
                            setMessage(e.target.value);
                            setError(null);
                            setSuccess(false);
                        }}
                        placeholder="Например: не поняла, как пройти уровень 3..."
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-neutral-300">
                        Как с вами связаться (необязательно)
                    </label>
                    <input
                        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-2 py-1 text-sm outline-none focus:border-emerald-400"
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

                <div className="flex justify-end gap-2 pt-1">
                    <button
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-600 text-neutral-200 hover:bg-slate-800"
                        onClick={onClose}
                        disabled={sending}
                    >
                        Закрыть
                    </button>
                    <button
                        className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 disabled:opacity-60"
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
