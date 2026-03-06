'use client';

import { useEffect, useState } from 'react';

export default function BrandToggle() {
  const [alphabetOpen, setAlphabetOpen] = useState(false);

  useEffect(() => {
    const onAlphabetOverlayState = (event: Event) => {
      const custom = event as CustomEvent<{ open?: boolean }>;
      setAlphabetOpen(Boolean(custom.detail?.open));
    };
    window.addEventListener('deda:alphabet-overlay-state', onAlphabetOverlayState as EventListener);
    return () => {
      window.removeEventListener('deda:alphabet-overlay-state', onAlphabetOverlayState as EventListener);
    };
  }, []);

  return (
    <button
      type="button"
      className={`header-control-btn inline-flex items-center justify-center px-4 ${
        alphabetOpen ? 'header-control-btn--active' : ''
      }`}
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
