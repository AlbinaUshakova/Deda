'use client';

import { useEffect } from 'react';

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  const displayModeStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  return iosStandalone || displayModeStandalone;
}

export default function StandaloneModeSync() {
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    const media = window.matchMedia?.('(display-mode: standalone)');

    const sync = () => {
      document.documentElement.dataset.standalone = isStandaloneMode() ? 'true' : 'false';
    };

    sync();
    media?.addEventListener?.('change', sync);

    return () => {
      media?.removeEventListener?.('change', sync);
    };
  }, []);

  return null;
}
