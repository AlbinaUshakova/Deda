import "./globals.css";
import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import AuthStatus from "@/components/AuthStatus";
import BrandToggle from "@/components/BrandToggle";
import GlobalAlphabetOverlay from "@/components/GlobalAlphabetOverlay";
import HeaderLessonTitle from "@/components/HeaderLessonTitle";
import ThemeSync from "@/components/ThemeSync";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Deda — Учим алфавит через игру",
  description: "Интерактивная игра для изучения грузинского алфавита и чтения по-грузински.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className={`${manrope.className} min-h-screen text-[var(--app-text)]`}>
        <ThemeSync />
        <header className="sticky top-0 z-[100] w-full border-b border-[var(--header-border)] bg-[var(--header-bg)] text-[var(--header-text)] backdrop-blur-md">
          <div className="mx-auto grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-3 sm:px-6 lg:w-[92vw] xl:w-[86vw] 2xl:w-[78vw] min-[1900px]:w-[70vw] min-[2100px]:w-[68vw] max-w-[1820px]">
            <div className="justify-self-start">
              <BrandToggle />
            </div>
            <div className="justify-self-center">
              <HeaderLessonTitle />
            </div>
            <div className="justify-self-end">
              <AuthStatus />
            </div>
          </div>
        </header>
        <GlobalAlphabetOverlay />

        <main className="w-full">
          <div className="mx-auto w-full lg:w-[92vw] xl:w-[86vw] 2xl:w-[78vw] min-[1900px]:w-[70vw] min-[2100px]:w-[68vw] max-w-[1820px]">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
