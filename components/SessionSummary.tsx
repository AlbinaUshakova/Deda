'use client';
import Link from 'next/link';
export default function SessionSummary({ score, cleared, onClose }: { score: number; cleared: number; onClose: () => void }) {
  const passed = score >= 500;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="card p-6 max-w-md w-full">
        <h2 className="h2 mb-2">Итоги сессии</h2>
        <div className="text-neutral-300 mb-1">Очки: <span className="badge">{score}</span></div>
        <div className="text-neutral-300 mb-4">Собрано слов: <span className="badge">{cleared}</span></div>
        <div className={passed ? 'text-emerald-400 mb-4' : 'text-neutral-400 mb-4'}>
          {passed ? 'Класс! Эпизод засчитан (≥ 500).' : 'Ещё немного — цель 500 очков.'}
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={onClose}>Продолжить</button>
          <Link className="btn" href="/">Главная</Link>
        </div>
      </div>
    </div>
  );
}
