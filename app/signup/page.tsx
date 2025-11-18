'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            setErrorMsg(error.message);
            setLoading(false);
            return;
        }

        // создаём профиль в таблице profiles
        if (data.user) {
            await supabase.from('profiles').insert({
                id: data.user.id,
                display_name: displayName || email,
            });
        }

        setLoading(false);
        router.push('/'); // после регистрации на главную
    };

    return (
        <main className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900/80 p-6 shadow-xl">
                <h1 className="text-2xl font-semibold mb-4 text-center text-white">
                    Sign up to Deda
                </h1>

                <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                        <label className="block text-sm text-neutral-200 mb-1">
                            Name (optional)
                        </label>
                        <input
                            type="text"
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-neutral-200 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-neutral-200 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <p className="mt-1 text-xs text-neutral-400">
                            Минимум 6 символов.
                        </p>
                    </div>

                    {errorMsg && (
                        <p className="text-sm text-red-400">{errorMsg}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 py-2 text-sm font-medium text-black"
                    >
                        {loading ? 'Creating account…' : 'Sign up'}
                    </button>
                </form>

                <p className="mt-4 text-center text-sm text-neutral-400">
                    Already have an account?{' '}
                    <a href="/login" className="text-emerald-400 hover:underline">
                        Log in
                    </a>
                </p>
            </div>
        </main>
    );
}
