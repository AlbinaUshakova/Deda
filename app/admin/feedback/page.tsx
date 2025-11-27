'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type FeedbackRow = {
    id: string;
    user_id: string | null;
    message: string;
    contact: string | null;
    created_at: string;
    admin_note: string | null;
};

export default function AdminFeedbackPage() {
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [rows, setRows] = useState<FeedbackRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // локальное состояние для комментариев
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [savingId, setSavingId] = useState<string | null>(null);

    // фильтры
    const [search, setSearch] = useState('');
    const [onlyWithContact, setOnlyWithContact] = useState(false);

    useEffect(() => {
        async function load() {
            if (!supabase) {
                setError('Supabase не настроен');
                setLoading(false);
                return;
            }

            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError || !userData?.user) {
                setError('Нужно войти в аккаунт, чтобы смотреть обратную связь');
                setLoading(false);
                return;
            }

            setUserEmail(userData.user.email ?? null);

            const { data, error } = await supabase
                .from('feedback')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500);

            if (error) {
                console.error(error);
                setError('Не удалось загрузить обратную связь');
                setLoading(false);
                return;
            }

            const list = (data as FeedbackRow[]) ?? [];
            setRows(list);

            // заполняем локальные заметки начальными значениями
            const initialNotes: Record<string, string> = {};
            list.forEach(r => {
                if (r.admin_note) initialNotes[r.id] = r.admin_note;
            });
            setNotes(initialNotes);

            setLoading(false);
        }

        load();
    }, []);

    const handleSaveNote = async (row: FeedbackRow) => {
        const value = (notes[row.id] ?? '').trim();

        if (!supabase) return;

        setSavingId(row.id);
        try {
            const { error } = await supabase
                .from('feedback')
                .update({ admin_note: value || null })
                .eq('id', row.id);

            if (error) {
                console.error('update admin_note error', error);
                setError('Не получилось сохранить комментарий');
            } else {
                // обновим локальное состояние строк
                setRows(prev =>
                    prev.map(r =>
                        r.id === row.id ? { ...r, admin_note: value || null } : r,
                    ),
                );
            }
        } finally {
            setSavingId(null);
        }
    };

    // фильтрация
    const filtered = rows.filter(r => {
        if (onlyWithContact && !r.contact) return false;

        if (!search.trim()) return true;
        const q = search.toLowerCase();

        return (
            r.message.toLowerCase().includes(q) ||
            (r.contact ?? '').toLowerCase().includes(q) ||
            (r.admin_note ?? '').toLowerCase().includes(q)
        );
    });

    return (
        <main className="min-h-screen bg-[#020617] text-neutral-50 px-6 py-6">
            <div className="max-w-6xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Обратная связь</h1>
                    <Link href="/" className="text-sm text-emerald-400 hover:underline">
                        ← На главную
                    </Link>
                </div>

                {/* панель фильтров */}
                <div className="flex flex-wrap items-center gap-3 mt-2">
                    <input
                        type="text"
                        placeholder="Поиск по тексту / контакту / моему комментарию"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="flex-1 min-w-[220px] rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
                    />
                    <label className="flex items-center gap-2 text-xs text-neutral-300">
                        <input
                            type="checkbox"
                            checked={onlyWithContact}
                            onChange={e => setOnlyWithContact(e.target.checked)}
                            className="rounded border-slate-500 bg-slate-900"
                        />
                        только с контактом
                    </label>
                    <div className="text-xs text-neutral-500">
                        Показано: {filtered.length} / {rows.length}
                    </div>
                </div>

                {loading && <div className="text-sm text-neutral-400">Загружаю…</div>}

                {error && !loading && (
                    <div className="text-sm text-red-400">{error}</div>
                )}

                {!loading && !error && filtered.length === 0 && (
                    <div className="text-sm text-neutral-400">
                        Ничего не найдено под текущие фильтры.
                    </div>
                )}

                {!loading && !error && filtered.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-900/70 border-b border-white/10 text-left">
                                    <th className="p-3 font-semibold text-neutral-300">Дата</th>
                                    <th className="p-3 font-semibold text-neutral-300">Сообщение</th>
                                    <th className="p-3 font-semibold text-neutral-300">Контакт</th>
                                    <th className="p-3 font-semibold text-neutral-300">user_id</th>
                                    <th className="p-3 font-semibold text-neutral-300 w-[280px]">
                                        комментарий
                                    </th>
                                    <th className="p-3 font-semibold" />
                                </tr>
                            </thead>

                            <tbody>
                                {filtered.map(row => (
                                    <tr
                                        key={row.id}
                                        className="border-b border-white/5 hover:bg-slate-900/40 align-top"
                                    >
                                        <td className="p-3 text-neutral-400 whitespace-nowrap text-xs">
                                            {new Date(row.created_at).toLocaleString()}
                                        </td>

                                        <td className="p-3 text-neutral-100 max-w-[360px] whitespace-pre-wrap">
                                            {row.message}
                                        </td>

                                        <td className="p-3 text-emerald-300 whitespace-nowrap text-xs">
                                            {row.contact || '—'}
                                        </td>

                                        <td className="p-3 text-neutral-500 text-[10px] whitespace-nowrap">
                                            {row.user_id || '—'}
                                        </td>

                                        <td className="p-3">
                                            <textarea
                                                className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2 py-1 text-xs outline-none focus:border-emerald-400 resize-none min-h-[48px]"
                                                value={notes[row.id] ?? row.admin_note ?? ''}
                                                onChange={e =>
                                                    setNotes(prev => ({
                                                        ...prev,
                                                        [row.id]: e.target.value,
                                                    }))
                                                }
                                                placeholder="Комментарий админа…"
                                            />
                                        </td>

                                        <td className="p-3">
                                            <button
                                                onClick={() => handleSaveNote(row)}
                                                disabled={savingId === row.id}
                                                className="px-3 py-1 text-xs rounded-lg bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 disabled:opacity-60"
                                            >
                                                {savingId === row.id ? '...' : '💾'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </main>
    );
}
