import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import AuthStatus from "@/components/AuthStatus";
import BrandToggle from "@/components/BrandToggle";
import GlobalAlphabetOverlay from "@/components/GlobalAlphabetOverlay";
import HeaderLessonTitle from "@/components/HeaderLessonTitle";
import StandaloneModeSync from "@/components/StandaloneModeSync";
import ThemeSync from "@/components/ThemeSync";
import VercelAnalytics from "@/components/VercelAnalytics";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Deda - учимся читать по-грузински играя.",
  description: "Слушай буквы, читай карточки и закрепляй чтение в игре.",
  openGraph: {
    title: "Deda - учимся читать по-грузински играя.",
    description: "Слушай буквы, читай карточки и закрепляй чтение в игре.",
    url: "/",
    locale: "ru_RU",
    type: "website",
    images: [
      {
        url: "/og-image-v2",
        width: 1200,
        height: 630,
        alt: "Deda - учимся читать по-грузински играя.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Deda - учимся читать по-грузински играя.",
    description: "Слушай буквы, читай карточки и закрепляй чтение в игре.",
    images: ["/og-image-v2"],
  },
  icons: {
    icon: "/images/deda-app-icon.png",
    shortcut: "/images/deda-app-icon.png",
    apple: "/images/deda-app-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen min-h-[100dvh] text-[var(--app-text)]">
        <ThemeSync />
        <StandaloneModeSync />
        <header className="sticky top-0 z-[260] h-[clamp(48px,7.2vh,66px)] w-full border-b border-[var(--header-border)] bg-[var(--header-bg)] text-[var(--header-text)] backdrop-blur-md">
          <div className="mx-auto grid h-full w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-[clamp(8px,1.8vw,16px)] px-[clamp(12px,2.4vw,24px)] sm:px-[clamp(14px,2.8vw,28px)] lg:w-[78vw] xl:w-[73vw] 2xl:w-[66vw] min-[1900px]:w-[60vw] min-[2100px]:w-[58vw] max-w-[1820px]">
            <div className="justify-self-start">
              <BrandToggle />
            </div>
            <div className="justify-self-center h-full">
              <HeaderLessonTitle />
            </div>
            <div className="justify-self-end">
              <AuthStatus />
            </div>
          </div>
        </header>
        <GlobalAlphabetOverlay />

        <main className="min-h-screen min-h-[100dvh] w-full bg-[var(--app-bg)]">
          <div className="mx-auto w-full bg-[var(--app-bg)] lg:w-[92vw] xl:w-[86vw] 2xl:w-[78vw] min-[1900px]:w-[70vw] min-[2100px]:w-[68vw] max-w-[1820px]">
            {children}
          </div>
        </main>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <VercelAnalytics />
      </body>
    </html>
  );
}
