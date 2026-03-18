'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StartRedirectClient() {
  const router = useRouter();

  useEffect(() => {
    const id = window.setTimeout(() => {
      router.replace('/landing');
    }, 150);

    return () => window.clearTimeout(id);
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 text-center text-[var(--text-secondary)]">
      <p className="max-w-[420px] text-sm leading-6">
        Открываем Deda...
      </p>
    </div>
  );
}
