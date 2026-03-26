'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';

const GA_STORAGE_EXCLUDE_KEY = 'deda_exclude_from_analytics';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!gaId) return;
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(GA_STORAGE_EXCLUDE_KEY) === '1') return;

    const query = searchParams?.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;
    let attemptsLeft = 20;

    const sendPageView = () => {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
          page_path: pagePath,
          page_location: window.location.href,
          page_title: document.title,
        });
        retryTimeoutRef.current = null;
        return;
      }

      if (attemptsLeft <= 0) return;
      attemptsLeft -= 1;
      retryTimeoutRef.current = setTimeout(sendPageView, 250);
    };

    sendPageView();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [gaId, pathname, searchParams]);

  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = window.gtag || gtag;

          gtag('js', new Date());
          gtag('config', '${gaId}', {
            send_page_view: false
          });
        `}
      </Script>
    </>
  );
}
