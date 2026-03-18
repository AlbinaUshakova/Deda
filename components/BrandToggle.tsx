'use client';

import Link from 'next/link';
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
    <div className="header-brand-wrap inline-flex items-center gap-4">
      <Link href="/" className="header-brand-label">
        Deda
      </Link>
      <button
        type="button"
        className={`header-control-btn header-control-btn--alphabet header-control-btn--alphabet-secondary inline-flex items-center justify-center px-2.5 ${
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
    </div>
  );
}
