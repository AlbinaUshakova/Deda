'use client';
import { useEffect, useState } from 'react';

type Row = { episodeId: string; best: number; updatedAt?: number };

export default function ProfileDialog({ open, onClose }:{ open: boolean; onClose: ()=>void }){
  const [rows, setRows] = useState<Row[]>([]);

  const load = () => {
    try {
      const raw = localStorage.getItem('deda_progress');
      const arr: Row[] = raw ? JSON.parse(raw) : [];
      arr.sort((a,b)=> (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
      setRows(arr);
    } catch { setRows([]); }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deda_progress.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-lg" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="h2">Профиль</div>
          <button className="btn" onClick={onClose}>Закрыть</button>
        </div>
        <div className="text-sm text-neutral-400 mb-3">Результаты на этом устройстве</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-neutral-400">
              <tr>
                <th className="text-left py-1">Эпизод</th>
                <th className="text-left py-1">Лучший результат</th>
                <th className="text-left py-1">Обновлён</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.episodeId} className="border-t border-neutral-800">
                  <td className="py-1">{r.episodeId}</td>
                  <td className="py-1">{r.best}</td>
                  <td className="py-1">{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {rows.length===0 && (
                <tr><td className="py-2 text-neutral-500" colSpan={3}>Пока пусто</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="btn" onClick={load}>Обновить</button>
          <button className="btn" onClick={exportJSON}>Скачать JSON</button>
        </div>
      </div>
    </div>
  );
}
