'use client';
import Link from 'next/link';
export default function TopBar() {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <Link href="/" className="text-lg font-semibold">Deda</Link>
      <div className="flex items-center gap-2">
        <Link className="btn" href="/settings">Настройки</Link>
        <Link className="btn" href="/auth">Войти</Link>
      </div>
    </div>
  );
}
