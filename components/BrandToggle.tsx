'use client';

export default function BrandToggle() {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-[1px] hover:bg-slate-50 hover:text-slate-800"
      onClick={() => {
        window.dispatchEvent(new CustomEvent('deda:toggle-alphabet'));
      }}
      aria-label="Показать или скрыть грузинский алфавит"
      title="Показать/скрыть алфавит"
    >
      Алфавит
    </button>
  );
}
