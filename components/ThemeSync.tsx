'use client';

import { useEffect } from 'react';
import { applyThemeToDocument, getSettings } from '@/lib/settings';

export default function ThemeSync() {
  useEffect(() => {
    const syncTheme = () => {
      applyThemeToDocument(getSettings().theme);
    };

    syncTheme();
    window.addEventListener('deda:settings-updated', syncTheme as EventListener);
    return () => {
      window.removeEventListener('deda:settings-updated', syncTheme as EventListener);
    };
  }, []);

  return null;
}
