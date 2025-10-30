'use client';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import Link from 'next/link';
import TopBar from '@/components/TopBar';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const online = !!supabase;
  const send = async () => {
    if (!supabase) return;
    setErr(null);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    if (error) setErr(error.message); else setSent(true);
  };
  return (
    <main>
      <TopBar />
      <div className="flex items-center justify-between mb-4"><h1 className="h1">Вход</h1><Link className="btn" href="/">На карту</Link></div>
      {online ? (
        <div className="card p-4 max-w-md">
          <label className="block text-sm mb-2">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
          <button className="btn mt-3" onClick={send}>Получить магическую ссылку</button>
          {sent && <div className="text-sm text-emerald-400 mt-2">Ссылка отправлена.</div>}
          {err && <div className="text-sm text-red-400 mt-2">{err}</div>}
        </div>
      ) : (
        <div className="card p-4"><p>Supabase не настроен. Доступен <span className="badge">офлайн‑режим</span>.</p><Link className="btn mt-2" href="/">Продолжить</Link></div>
      )}
    </main>
  );
}
