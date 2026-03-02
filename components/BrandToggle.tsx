'use client';

export default function BrandToggle() {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-1.5 text-sm font-medium text-white/90 hover:bg-white/5 hover:text-white transition-colors"
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
