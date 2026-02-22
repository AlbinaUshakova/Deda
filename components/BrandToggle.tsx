'use client';

export default function BrandToggle() {
  return (
    <button
      type="button"
      className="font-semibold text-base sm:text-lg text-white/95 hover:text-white transition-colors"
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
