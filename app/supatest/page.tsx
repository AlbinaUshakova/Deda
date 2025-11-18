'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SupaTestPage() {
    const [msg, setMsg] = useState('checking...');

    useEffect(() => {
        async function test() {
            try {
                if (!supabase) {
                    setMsg('❌ supabase is NULL (env vars not loaded)');
                    return;
                }

                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .limit(1);

                if (error) setMsg('❌ Error: ' + error.message);
                else setMsg('✅ Supabase OK. Query succeeded.');
            } catch (e: any) {
                setMsg('❌ Exception: ' + e?.message);
            }
        }

        test();
    }, []);

    return (
        <main style={{ padding: 32, color: 'white', fontSize: 18 }}>
            <h1>Supabase test page</h1>
            <p style={{ marginTop: 16 }}>Status: {msg}</p>
        </main>
    );
}
