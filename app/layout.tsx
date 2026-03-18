import "./globals.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import AuthStatus from "@/components/AuthStatus";
import BrandToggle from "@/components/BrandToggle";
import GlobalAlphabetOverlay from "@/components/GlobalAlphabetOverlay";
import HeaderLessonTitle from "@/components/HeaderLessonTitle";
import ThemeSync from "@/components/ThemeSync";

export const metadata: Metadata = {
  title: "Deda - учимся читать по-грузински, играя.",
  description: "Слушай буквы, читай карточки и закрепляй чтение в игре.",
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
        <Analytics />
      </body>
    </html>
  );
}
